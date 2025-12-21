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
        skills_needed = data.get('skills_needed', []) 
        author_name = decoded_token.get('name') or decoded_token.get('email', 'Anonymous')

        # 1. VALIDATION
        if not title or not description:
            return jsonify({"error": "Title and description are required"}), 400

        # 2. CONTENT SAFETY 
        if not is_content_safe(description):
            return jsonify({
                "error": "Post rejected. Our AI detected negative sentiment. Let's keep the community constructive!"
            }), 400

        visibility = data.get('visibility', 'public')
        scheduled_for = data.get('scheduled_for')
        status = 'scheduled' if scheduled_for else 'active'
        poll_options = data.get('poll_options', [])

        media_items = []
        raw_media = data.get('media_items', []) 
        for m in raw_media:
            if isinstance(m, str):
                media_items.append({'url': m, 'alt': ''})
            else:
                media_items.append(m)

        # 3. SAVE
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
            'poll_options': poll_options,
            'likes': 0,
            'media_urls': [m['url'] for m in media_items],
            'media_items': media_items
        }
        post_ref.set(post_data)

        return success_response({"message": "Project posted successfully!", "postId": post_ref.id}, status=201)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@feed_bp.route('/', methods=['GET'], strict_slashes=False)
def get_feed():
    try:
        filter_skill = request.args.get('skill')
        author_uid = request.args.get('author_uid')
        
        db = get_db()
        posts_ref = db.collection('posts')

        query = posts_ref

        if author_uid:
            query = query.where(filter=firestore.FieldFilter('author_uid', '==', author_uid))
        elif filter_skill:
            query = query.where(filter=firestore.FieldFilter('status', '==', 'active')).where(filter=firestore.FieldFilter('skills_needed', 'array_contains', filter_skill))
        
        results = query.stream()
        posts = []
        search_query = request.args.get('q', '').lower().strip()
        
        for doc in results:
            d = doc.to_dict()
            
            # Server-side filtering by q
            if search_query:
                title = d.get('title', '').lower()
                desc = d.get('description', '').lower()
                if search_query not in title and search_query not in desc:
                    continue

            ts = d.get('timestamp')
            if hasattr(ts, 'isoformat'):
                try: d['timestamp'] = ts.isoformat()
                except: d['timestamp'] = str(ts)
            
            posts.append(d)

        # Smart Ranking
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)

        def calculate_score(post):
             likes = post.get('likes', 0)
             comments = post.get('comments_count', 0)
             ts_str = post.get('timestamp')
             try:
                if isinstance(ts_str, datetime): pt = ts_str.replace(tzinfo=timezone.utc)
                else: pt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
             except: pt = now

             age_hours = (now - pt).total_seconds() / 3600
             if age_hours < 0: age_hours = 0
             return (likes + (comments * 2) + 1) / pow(age_hours + 2, 1.8)

        posts.sort(key=calculate_score, reverse=True)

        # Pagination logic
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
        if not doc.exists: return jsonify({"error": "Post not found"}), 404
        d = doc.to_dict()
        ts = d.get('timestamp')
        if hasattr(ts, 'isoformat'):
            try: d['timestamp'] = ts.isoformat()
            except: d['timestamp'] = str(ts)
        
        # More from Author
        author_uid = d.get('author_uid')
        more_from_author = []
        if author_uid:
            qs = db.collection('posts').where(filter=firestore.FieldFilter('author_uid', '==', author_uid)).limit(4).stream()
            for q in qs:
                if q.id != post_id:
                    md = q.to_dict()
                    more_from_author.append({ 'id': q.id, 'title': md.get('title'), 'media_urls': md.get('media_urls', []) })
        d['more_from_author'] = more_from_author[:3]

        # Similar Projects
        similar_projects = []
        skills = d.get('skills_needed', [])
        if skills:
            qs2 = db.collection('posts').where(filter=firestore.FieldFilter('skills_needed', 'array_contains_any', skills[:10])).limit(5).stream()
            for q in qs2:
                if q.id != post_id:
                     md = q.to_dict()
                     similar_projects.append({ 'id': q.id, 'title': md.get('title'), 'media_urls': md.get('media_urls', []) })
        d['similar_projects'] = similar_projects[:3]

        return success_response(d, status=200)
    except Exception as e: return jsonify({"error": str(e)}), 500

@feed_bp.route('/<post_id>/join', methods=['POST'])
def join_project(post_id):
    try:
        data = request.json or {}
        requester_uid = data.get('uid') 
        requester_name = data.get('name', 'A student')
        
        if not requester_uid: return jsonify({"error": "Requester UID required"}), 400

        db = get_db()
        post_ref = db.collection('posts').document(post_id)
        post_doc = post_ref.get()
        if not post_doc.exists: return jsonify({"error": "Post not found"}), 404
            
        post_data = post_doc.to_dict()
        author_uid = post_data.get('author_uid')

        if author_uid:
            notif_ref = db.collection('users').document(author_uid).collection('notifications').document()
            notif_ref.set({
                'title': 'New Join Request',
                'body': f"{requester_name} wants to join '{post_data.get('title')}'",
                'type': 'join_request',
                'projectId': post_id,
                'fromUid': requester_uid,
                'read': False,
                'timestamp': datetime.datetime.now()
            })
        return jsonify({"message": "Request sent successfully"}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@feed_bp.route('/upload_media', methods=['POST'])
def upload_media():
    try:
        if 'file' not in request.files: return jsonify({"error": "No file uploaded"}), 400
        f = request.files['file']
        filename = f.filename or 'upload.bin'
        bucket = storage.bucket()
        blob = bucket.blob(f'posts/media/{filename}')
        blob.upload_from_string(f.read(), content_type=f.content_type)
        blob.make_public()
        return jsonify({"url": blob.public_url}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500
