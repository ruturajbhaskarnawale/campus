from flask import Blueprint, request, jsonify
from lib.core.utils.firebase_config import get_db
from lib.core.utils.ml_validator import is_content_safe
from lib.core.utils.response import success_response, error_response
from lib.core.utils.auth_middleware import require_auth
import datetime
from firebase_admin import storage, firestore

feed_bp = Blueprint('feed', __name__)

@feed_bp.route('/create', methods=['POST'])
@require_auth
def create_post(decoded_token=None):
    try:
        data = request.json
        title = data.get('title')
        description = data.get('description')
        skills_needed = data.get('skills_needed', []) # List of strings e.g. ['Python', 'Unity']
        # Use the authenticated user's info from decoded token
        author_name = decoded_token.get('name') or decoded_token.get('email', 'Anonymous')

        # 1. VALIDATION (Basic)
        if not title or not description:
            return jsonify({"error": "Title and description are required"}), 400

        # 2. ML "X-FACTOR" CHECK
        # If the description is toxic, reject it immediately.
        if not is_content_safe(description):
            return jsonify({
                "error": "Post rejected. Our AI detected negative sentiment. Let's keep the community constructive!"
            }), 400

        visibility = data.get('visibility', 'public') # 'public', 'connections', 'private'
        scheduled_for = data.get('scheduled_for')
        status = 'scheduled' if scheduled_for else 'active'
        poll_options = data.get('poll_options', []) # List of strings ['A', 'B']

        # Media Handling: can be simple URLs or objects with alt_text
        raw_media = data.get('media_items', []) 
        # Normalize to list of dicts: { url: '...', alt: '...' }
        media_items = []
        for m in raw_media:
            if isinstance(m, str):
                media_items.append({'url': m, 'alt': ''})
            else:
                media_items.append(m)

        # 3. SAVE TO FIRESTORE
        db = get_db()
        post_ref = db.collection('posts').document()
        post_data = {
            'id': post_ref.id,
            'title': title,
            'description': description,
            'skills_needed': skills_needed,
            'author_name': author_name,
            'author_uid': decoded_token.get('uid'),
            'timestamp': datetime.datetime.now(),
            'scheduled_for': scheduled_for,
            'status': status,
            'visibility': visibility,
            'poll_options': poll_options, # If present, frontend renders a poll
            'likes': 0,
            'media_urls': [m['url'] for m in media_items], # Backward compat
            'media_items': media_items
        }
        post_ref.set(post_data)

        return success_response({"message": "Project posted successfully!", "postId": post_ref.id}, status=201)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
@feed_bp.route('/', methods=['GET'], strict_slashes=False)
def get_feed():
    try:
        # USP: SMART SKILL MATCHING
        filter_skill = request.args.get('skill')
        author_uid = request.args.get('author_uid')
        
        db = get_db()
        posts_ref = db.collection('posts')

        query = posts_ref

        if author_uid:
            # Get specific user's posts
            query = query.where(filter=firestore.FieldFilter('author_uid', '==', author_uid))
        elif filter_skill:
            query = query.where(filter=firestore.FieldFilter('status', '==', 'active')).where(filter=firestore.FieldFilter('skills_needed', 'array_contains', filter_skill))
        else:
            # If no filter, show all posts (active and historical)
            # Ordered by timestamp descending would be ideal but requires index
            # For now, we query everything and sort in memory for this MVP size
            pass

        results = query.stream()

        posts = []
        for doc in results:
            d = doc.to_dict()
            # serialize timestamp if present
            ts = d.get('timestamp')
            if hasattr(ts, 'isoformat'):
                try:
                    d['timestamp'] = ts.isoformat()
                except Exception:
                    d['timestamp'] = str(ts)
            
            # Fetch author avatar if not present (simple hydration)
            if 'author_uid' in d and 'author_avatar' not in d:
                 # Optional: could fetch user doc here. 
                 # For performance, we skip or let frontend fetch profile.
                 pass

            posts.append(d)

        # Algorithmic Sort (Smart Ranking)
        # Score = (Likes + Comments*2 + 1) / (TimeHours + 2)^1.8
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc)

        def calculate_score(post):
             likes = post.get('likes', 0)
             comments = post.get('comments_count', 0)
             
             # Parse timestamp
             ts_str = post.get('timestamp')
             try:
                # Handle ISO format Z or offset
                if isinstance(ts_str, datetime):
                    pt = ts_str.replace(tzinfo=timezone.utc)
                else: 
                     # Basic fallback parser if string
                     pt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
             except:
                pt = now

             # Calculate age in hours
             age_hours = (now - pt).total_seconds() / 3600
             if age_hours < 0: age_hours = 0
             
             gravity = 1.8
             score = (likes + (comments * 2) + 1) / pow(age_hours + 2, gravity)
             return score

        posts.sort(key=calculate_score, reverse=True)

        # Pagination support (optional, simple splicing for now)
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        start = (page - 1) * limit
        end = start + limit
        
        return success_response(posts[start:end], status=200)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feed_bp.route('/<post_id>', methods=['GET'])
def get_post(post_id):
    try:
        db = get_db()
        doc = db.collection('posts').document(post_id).get()
        if not doc.exists:
            return jsonify({"error": "Post not found"}), 404
        d = doc.to_dict()
        ts = d.get('timestamp')
        if hasattr(ts, 'isoformat'):
            try:
                d['timestamp'] = ts.isoformat()
            except Exception:
                d['timestamp'] = str(ts)
        
        # 1. More from Author
        author_uid = d.get('author_uid')
        more_from_author = []
        if author_uid:
            # Fetch up to 4, then exclude current
            qs = db.collection('posts').where(filter=firestore.FieldFilter('author_uid', '==', author_uid)).limit(4).stream()
            for q in qs:
                if q.id != post_id:
                    md = q.to_dict()
                    more_from_author.append({
                        'id': q.id,
                        'title': md.get('title'),
                        'media_urls': md.get('media_urls', []),
                        'timestamp': str(md.get('timestamp'))
                    })
        d['more_from_author'] = more_from_author[:3]

        # 2. Similar Projects (Logic: Same primary skill)
        similar_projects = []
        skills = d.get('skills_needed', [])
        if skills:
            # Firestore array-contains-any limit is 10
            qs2 = db.collection('posts').where(filter=firestore.FieldFilter('skills_needed', 'array_contains_any', skills[:10])).limit(5).stream()
            for q in qs2:
                if q.id != post_id:
                     md = q.to_dict()
                     similar_projects.append({
                        'id': q.id,
                        'title': md.get('title'),
                         'media_urls': md.get('media_urls', []),
                         'timestamp': str(md.get('timestamp'))
                     })
        d['similar_projects'] = similar_projects[:3]

        return success_response(d, status=200)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feed_bp.route('/<post_id>/join', methods=['POST'])
def join_project(post_id):
    try:
        data = request.json or {}
        # User who wants to join
        requester_uid = data.get('uid') 
        requester_name = data.get('name', 'A student')
        
        if not requester_uid:
            return jsonify({"error": "Requester UID required"}), 400

        db = get_db()
        post_ref = db.collection('posts').document(post_id)
        post_doc = post_ref.get()
        
        if not post_doc.exists:
            return jsonify({"error": "Post not found"}), 404
            
        post_data = post_doc.to_dict()
        author_uid = post_data.get('author_uid')
        post_title = post_data.get('title', 'Project')

        if author_uid:
            # Send notification to author
            notif_ref = db.collection('users').document(author_uid).collection('notifications').document()
            notif_ref.set({
                'title': 'New Join Request',
                'body': f"{requester_name} wants to join '{post_title}'",
                'type': 'join_request',
                'projectId': post_id,
                'fromUid': requester_uid,
                'read': False,
                'timestamp': datetime.datetime.now()
            })

        return jsonify({"message": "Request sent successfully"}), 200

    except Exception as e:
         return jsonify({"error": str(e)}), 500

@feed_bp.route('/upload_media', methods=['POST'])
def upload_media():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        f = request.files['file']
        filename = f.filename or 'upload.bin'

        bucket = storage.bucket()
        blob_path = f'posts/media/{filename}'
        blob = bucket.blob(blob_path)
        blob.upload_from_string(f.read(), content_type=f.content_type)
        try:
            blob.make_public()
            public_url = blob.public_url
        except Exception:
            public_url = blob.path

        return jsonify({"url": public_url}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feed_bp.route('/<post_id>/react', methods=['POST', 'GET'])
def react_post(post_id):
    try:
        db = get_db()
        
        if request.method == 'GET':
            # Get like status for current user
            data = request.args
            user_id = data.get('uid')
            if not user_id:
                return jsonify({"error": "User ID required"}), 400
                
            like_doc = db.collection('posts').document(post_id).collection('likes').document(user_id).get()
            post_doc = db.collection('posts').document(post_id).get()
            
            if not post_doc.exists:
                return jsonify({"error": "Post not found"}), 404
                
            post_data = post_doc.to_dict()
            total_likes = post_data.get('likes', 0)
            
            return jsonify({
                "liked": like_doc.exists,
                "likesCount": total_likes
            }), 200
        
        # POST: Toggle like
        data = request.json or {}
        user_id = data.get('uid')
        user_name = data.get('user_name', 'Anonymous')
        
        if not user_id:
            return jsonify({"error": "User ID required"}), 400

        post_ref = db.collection('posts').document(post_id)
        post_doc = post_ref.get()
        
        if not post_doc.exists:
            return jsonify({"error": "Post not found"}), 404
        
        likes_ref = post_ref.collection('likes')
        user_like_ref = likes_ref.document(user_id)
        user_like_doc = user_like_ref.get()
        
        if user_like_doc.exists:
            # Unlike: remove like
            user_like_ref.delete()
            post_ref.update({'likes': firestore.Increment(-1)})
            action = 'unliked'
        else:
            # Like: add like
            user_like_ref.set({
                'user_id': user_id,
                'user_name': user_name,
                'timestamp': datetime.datetime.now()
            })
            post_ref.update({'likes': firestore.Increment(1)})
            action = 'liked'
            
            # Notify post author
            post_data = post_doc.to_dict()
            author_uid = post_data.get('author_uid')
            if author_uid and author_uid != user_id:
                notif_ref = db.collection('users').document(author_uid).collection('notifications').document()
                notif_ref.set({
                    'title': 'New Like',
                    'body': f"{user_name} liked your post: {post_data.get('title', '')}",
                    'type': 'like',
                    'postId': post_id,
                    'fromUid': user_id,
                    'read': False,
                    'timestamp': datetime.datetime.now()
                })
        
        # Get updated like count
        updated_post = post_ref.get().to_dict()
        
        return jsonify({
            "message": action.capitalize(),
            "liked": action == 'liked',
            "likesCount": updated_post.get('likes', 0)
        }), 200

    except Exception as e:
        print(f"React error: {e}")
        return jsonify({"error": str(e)}), 500


@feed_bp.route('/<post_id>/comments', methods=['POST', 'GET'])
def comments(post_id):
    try:
        db = get_db()
        comments_ref = db.collection('posts').document(post_id).collection('comments')

        if request.method == 'GET':
            sort_mode = request.args.get('sort', 'newest') # 'top' or 'newest'
            limit = int(request.args.get('limit', 5)) # Load-on-Demand default 5
            
            query = comments_ref
            
            # Simple sorting
            if sort_mode == 'top':
                query = query.order_by('likes', direction=firestore.Query.DESCENDING)
            else:
                query = query.order_by('timestamp', direction=firestore.Query.DESCENDING) # Newest first is standard

            # basic pagination would generally need cursors, but for now just limit
            results = query.limit(limit).stream()
            
            # For "View More", frontend will likely need to fetch all or use cursor. 
            # For this Phase, we'll return all if limit is high, or just the top N.
            # Ideally we pass a 'last_timestamp' cursor. 
            
            out = []
            
            # Get Post Author for Badging
            post_doc = db.collection('posts').document(post_id).get()
            post_author_uid = post_doc.to_dict().get('author_uid') if post_doc.exists else None

            for c in results:
                cd = c.to_dict()
                
                # Check for hidden status
                if cd.get('hidden', False):
                     # Only return if admin (omitted for now) or just placeholder
                     cd['text'] = "[Comment hidden due to low quality]"
                
                # Badges
                cd['badges'] = []
                if cd.get('author_uid') == post_author_uid:
                    cd['badges'].append('Author')
                # If verified... cd['badges'].append('Verified')

                ts = cd.get('timestamp')
                if hasattr(ts, 'isoformat'):
                    try:
                        cd['timestamp'] = ts.isoformat()
                    except Exception:
                        cd['timestamp'] = str(ts)
                out.append(cd)
            
            return jsonify(out), 200

        # POST: create comment
        data = request.json or {}
        text = data.get('text')
        parent = data.get('parentId')
        author_name = data.get('author_name', 'Anonymous')
        author_uid = data.get('uid') # Should be from auth token ideally

        if not text:
            return jsonify({"error": "Text is required"}), 400

        # Sentiment Analysis Flag
        is_safe = is_content_safe(text)
        hidden = not is_safe

        comment_ref = comments_ref.document()
        comment_data = {
            'id': comment_ref.id,
            'text': text,
            'parentId': parent,
            'author_name': author_name,
            'author_uid': author_uid,
            'timestamp': datetime.datetime.now(),
            'likes': 0,
            'sentiment_safe': is_safe,
            'hidden': hidden
        }
        comment_ref.set(comment_data)
        
        msg = "Comment added"
        if hidden:
            msg = "Comment submitted for review (potential policy violation)"
            
        return jsonify({"message": msg, "id": comment_ref.id, "hidden": hidden}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feed_bp.route('/<post_id>/bookmark', methods=['POST'])
def bookmark(post_id):
    try:
        data = request.json or {}
        # Try to get uid from Authorization Bearer token (handled by auth endpoints elsewhere)
        uid = data.get('uid') or data.get('userId')
        if not uid:
            return jsonify({"error": "Missing user id (provide uid in request body for testing)"}), 400

        db = get_db()
        bookmark_ref = db.collection('users').document(uid).collection('bookmarks').document(post_id)
        bookmark_ref.set({ 'postId': post_id, 'timestamp': datetime.datetime.now() })
        return jsonify({"message": "Bookmarked"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feed_bp.route('/user/<user_id>/bookmarks', methods=['GET'])
def list_bookmarks(user_id):
    try:
        db = get_db()
        results = db.collection('users').document(user_id).collection('bookmarks').stream()
        out = []
        for r in results:
            rd = r.to_dict()
            ts = rd.get('timestamp')
            if hasattr(ts, 'isoformat'):
                try:
                    rd['timestamp'] = ts.isoformat()
                except Exception:
                    rd['timestamp'] = str(ts)
            out.append(rd)
        return jsonify(out), 200
    except Exception as e:
        return error_response(str(e), status=500)


@feed_bp.route('/<post_id>/share', methods=['POST'])
def share_post(post_id):
    """Share a post with other users"""
    try:
        data = request.json or {}
        from_uid = data.get('from_uid')
        to_uids = data.get('to_uids', [])  # List of user IDs to share with
        message = data.get('message', '')  # Optional message
        
        if not from_uid:
            return jsonify({"error": "Sender user ID required"}), 400
        if not to_uids or not isinstance(to_uids, list):
            return jsonify({"error": "Recipient user IDs required"}), 400
            
        db = get_db()
        
        # Get post details
        post_ref = db.collection('posts').document(post_id)
        post_doc = post_ref.get()
        if not post_doc.exists:
            return jsonify({"error": "Post not found"}), 404
            
        post_data = post_doc.to_dict()
        post_title = post_data.get('title', 'a post')
        
        # Get sender name
        sender_doc = db.collection('users').document(from_uid).get()
        sender_name = sender_doc.to_dict().get('name', 'Someone') if sender_doc.exists else 'Someone'
        
        # Send notification to each recipient
        shared_count = 0
        for to_uid in to_uids:
            try:
                notif_ref = db.collection('users').document(to_uid).collection('notifications').document()
                notif_data = {
                    'title': 'Post Shared',
                    'body': f"{sender_name} shared: {post_title}",
                    'type': 'share',
                    'postId': post_id,
                    'fromUid': from_uid,
                    'read': False,
                    'timestamp': datetime.datetime.now()
                }
                if message:
                    notif_data['message'] = message
                    
                notif_ref.set(notif_data)
                shared_count += 1
            except Exception as e:
                print(f"Error sharing to user {to_uid}: {e}")
                continue
        
        return jsonify({
            "message": f"Post shared with {shared_count} user(s)",
            "sharedCount": shared_count
        }), 200
        
    except Exception as e:
        print(f"Share error: {e}")
        return jsonify({"error": str(e)}), 500


@feed_bp.route('/cron/publish', methods=['POST'])
def publish_scheduled():
    try:
        db = get_db()
        # Find posts that are scheduled and due
        # In real app: where('scheduled_for', '<=', now)
        # For demo: publish all 'scheduled' posts
        posts = db.collection('posts').where('status', '==', 'scheduled').stream()
        count = 0
        for p in posts:
            p.reference.update({'status': 'active'})
            count += 1
        return jsonify({"message": f"Published {count} posts"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
