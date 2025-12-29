from flask import Blueprint, request, jsonify
from lib.db.database import db_session
from lib.db.models import Post, User, Project, Notification, PostLike, SavedPost
from lib.core.utils.ml_validator import is_content_safe
from lib.core.utils.response import success_response, error_response
from lib.core.utils.auth_middleware import require_auth, verify_request_token
import datetime
import random

feed_bp = Blueprint('feed', __name__)

@feed_bp.route('/create', methods=['POST'])
@require_auth
def create_post(decoded_token=None):
    try:
        data = request.json
        title = data.get('title')
        description = data.get('description')
        skills_needed = data.get('skills_needed', []) 
        
        uid = decoded_token.get('uid')
        
        session = db_session
        user = session.query(User).filter(User.uid == uid).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # 1. VALIDATION
        if not title or not description:
            return jsonify({"error": "Title and description are required"}), 400
            
        # 2. SAVE
        new_post = Post(
            author_id=user.id,
            title=title,
            content_body=description,
            tags_json=skills_needed,
            type='post',
            created_at=datetime.datetime.utcnow(),
            likes_count=0,
            comments_count=0
        )
        
        if data.get('type') == 'project' or len(skills_needed) > 0:
             new_post.type = 'project'
             project = Project(
                 owner_id=user.id,
                 status='recruiting',
                 skills_required_json=skills_needed
             )
             new_post.project = project

        session.add(new_post)
        session.commit()

        return success_response({"message": "Posted successfully!", "postId": new_post.id}, status=201)

    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500

@feed_bp.route('/', methods=['GET'], strict_slashes=False)
def get_feed():
    try:
        session = db_session
        
        # Determine current user for is_liked/is_saved
        # Optional Auth check manually
        decoded, _ = verify_request_token(request)
        current_user_id = None
        if decoded:
            u = session.query(User).filter(User.uid == decoded.get('uid')).first()
            if u: current_user_id = u.id

        query = session.query(Post).order_by(Post.created_at.desc())
        
        # Filters
        author_uid = request.args.get('author_uid')
        if author_uid:
            user = session.query(User).filter(User.uid == author_uid).first()
            if user:
                query = query.filter(Post.author_id == user.id)
                
        # Pagination
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        posts = query.limit(limit).offset((page - 1) * limit).all()
        
        # Fetch likes/saves for batch
        liked_post_ids = set()
        saved_post_ids = set()
        if current_user_id and posts:
            pids = [p.id for p in posts]
            likes = session.query(PostLike.post_id, PostLike.reaction_type).filter(PostLike.user_id == current_user_id, PostLike.post_id.in_(pids)).all()
            saves = session.query(SavedPost.post_id).filter(SavedPost.user_id == current_user_id, SavedPost.post_id.in_(pids)).all()
            liked_post_ids = {l[0]: l[1] for l in likes}
            saved_post_ids = {s[0] for s in saves}

        results = []
        for p in posts:
            d = {
                'id': p.id,
                'title': p.title,
                'description': p.content_body,
                'type': p.type,
                'timestamp': p.created_at.isoformat(),
                'likes': p.likes_count or 0,
                'comments_count': p.comments_count or 0,
                'author_uid': p.author.uid if p.author else None,
                'author_name': p.author.full_name if p.author else 'Unknown',
                'author_avatar': p.author.avatar_url if p.author else '',
                'media_urls': p.media_urls_json if p.media_urls_json else [],
                'tags': p.tags_json if p.tags_json else [],
                'is_liked': p.id in liked_post_ids,
                'my_reaction': liked_post_ids.get(p.id),
                'poll_data': p.poll_data_json,
                'views': p.views_count,
                'is_saved': p.id in saved_post_ids
            }
            if p.project:
                d['skills_needed'] = p.project.skills_required_json
            elif p.tags_json:
                d['skills_needed'] = p.tags_json
                
            results.append(d)

        return success_response(results, status=200)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@feed_bp.route('/<int:post_id>', methods=['GET'])
def get_post(post_id):
    try:
        session = db_session
        p = session.query(Post).filter(Post.id == post_id).first()
        
        if not p: return jsonify({"error": "Post not found"}), 404
        
        # Optional Auth
        decoded, _ = verify_request_token(request)
        current_user_id = None
        is_liked = False
        is_saved = False
        
        if decoded:
            u = session.query(User).filter(User.uid == decoded.get('uid')).first()
            if u: 
                current_user_id = u.id
                if session.query(PostLike).filter_by(user_id=u.id, post_id=p.id).first(): is_liked = True
                if session.query(SavedPost).filter_by(user_id=u.id, post_id=p.id).first(): is_saved = True

        d = {
            'id': p.id,
            'title': p.title,
            'description': p.content_body,
            'type': p.type,
            'timestamp': p.created_at.isoformat(),
            'likes': p.likes_count,
            'author_uid': p.author.uid,
            'author_name': p.author.full_name,
            'author_avatar': p.author.avatar_url,
            'media_urls': p.media_urls_json if p.media_urls_json else [],
            'is_liked': is_liked,
            'is_saved': is_saved
        }
        if p.project:
            d['skills_needed'] = p.project.skills_required_json
            d['project_status'] = p.project.status

        # Increment View
        p.views_count = (p.views_count or 0) + 1
        session.commit()

        # Comments
        comments_data = []
        from lib.db.models import Comment
        # Fetch root comments
        comments = session.query(Comment).filter(Comment.post_id == p.id, Comment.parent_id == None).order_by(Comment.created_at.desc()).all()
        
        # Helper to recursively fetch replies (efficient way would be 1 query and map, but for now logic matches routes)
        # Actually we did the map logic in get_post_comments route, let's replicate that or just fetch all and map here?
        # For simplicity in PostDetail get_post (which returns single post), let's use the same logic as get_post_comments or just return basic roots.
        # Ideally PostDetail fetches comments separately via /comments endpoint (which we updated).
        # PostDetail.js calls loadData -> getPost AND fetchComments. So getPost doesn't need to return comments deep tree.
        # But getPost currently returns 'comments': comments_data.
        # Let's keep it minimal here or remove it if frontend uses fetchComments.
        # Frontend PostDetail.js: 
        # // 1. Get Post ... setPost(res.data)
        # // 2. Get Comments ... fetchComments()
        # So we can remove comments from here or keep it empty.
        
        # Similar Projects (Mock Logic based on category/tags)
        similar = []
        if p.tags_json:
             # Find posts with intersecting tags
             similar_posts = session.query(Post).filter(Post.id != p.id).limit(5).all()
             for sp in similar_posts:
                 similar.append({
                     'id': sp.id,
                     'title': sp.title,
                     'media_urls': sp.media_urls_json or []
                 })
        d['similar_projects'] = similar
        d['more_from_author'] = [] # Simplified
        
        d['comments'] = [] # Frontend fetches separately
        
        return success_response(d, status=200)
    except Exception as e: return jsonify({"error": str(e)}), 500

@feed_bp.route('/<int:post_id>/like', methods=['POST'])
@require_auth
def like_post(post_id, decoded_token=None):
    try:
        session = db_session
        uid = decoded_token.get('uid')
        user = session.query(User).filter(User.uid == uid).first()
        if not user: return jsonify({"error": "User not found"}), 404

        post = session.query(Post).filter(Post.id == post_id).first()
        if not post: return jsonify({"error": "Post not found"}), 404

        # Toggle Like
        existing = session.query(PostLike).filter_by(user_id=user.id, post_id=post.id).first()
        liked = False
        
        if existing:
            # If same reaction, remove it (toggle off)
            if existing.reaction_type == request.json.get('reaction_type', 'like'):
                session.delete(existing)
                post.likes_count = max(0, (post.likes_count or 0) - 1)
                liked = False
            else:
                # Change reaction (e.g. like -> love)
                existing.reaction_type = request.json.get('reaction_type', 'like')
                liked = True
        else:
            new_like = PostLike(
                user_id=user.id, 
                post_id=post.id,
                reaction_type=request.json.get('reaction_type', 'like')
            )
            session.add(new_like)
            post.likes_count = (post.likes_count or 0) + 1
            liked = True
            
            # Interconnectivity: XP & Notification
            if post.author_id != user.id:
                # 1. Notify Author
                notif = Notification(
                    recipient_id=post.author_id,
                    sender_id=user.id,
                    type='like', # standard type
                    title='New Like',
                    body=f"{user.full_name} liked your post.",
                    reference_id=post.id,
                    reference_type='post',
                    created_at=datetime.datetime.utcnow()
                )
                session.add(notif)
                
                # 2. XP for Author (Engagement)
                post.author.xp_points = (post.author.xp_points or 0) + 5
                
                # 3. XP for Liker (Action)
                user.xp_points = (user.xp_points or 0) + 1
        
        session.commit()
        return jsonify({
            "message": "Success", 
            "liked": liked, 
            "likes_count": post.likes_count,
            "reaction_type": request.json.get('reaction_type', 'like') if liked else None
        }), 200

    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500

@feed_bp.route('/<int:post_id>/save', methods=['POST'])
@require_auth
def save_post(post_id, decoded_token=None):
    try:
        session = db_session
        uid = decoded_token.get('uid')
        user = session.query(User).filter(User.uid == uid).first()
        
        post = session.query(Post).filter(Post.id == post_id).first()
        if not post: return jsonify({"error": "Post not found"}), 404
        
        existing = session.query(SavedPost).filter_by(user_id=user.id, post_id=post.id).first()
        saved = False
        
        if existing:
            session.delete(existing)
            saved = False
        else:
            new_save = SavedPost(user_id=user.id, post_id=post.id)
            session.add(new_save)
            saved = True
            
        session.commit()
        return jsonify({"message": "Success", "saved": saved}), 200

    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500

@feed_bp.route('/<int:post_id>/join', methods=['POST'])
@require_auth
def join_project(post_id, decoded_token=None):
    try:
        uid = decoded_token.get('uid')
        session = db_session
        user = session.query(User).filter(User.uid == uid).first()
        post = session.query(Post).filter(Post.id == post_id).first()
        
        if not post: return jsonify({"error": "Post not found"}), 404
        
        # Check if own post
        if post.author_id == user.id:
            return jsonify({"error": "Cannot join your own project"}), 400

        # Create notification with default message
        default_msg = f"{user.full_name} is interested in joining your project '{post.title}'."
        
        notif = Notification(
            recipient_id=post.author_id,
            type='join_request',
            title='New Project Request',
            body=default_msg,
            reference_id=post_id,
            reference_type='post',
            created_at=datetime.datetime.utcnow()
        )
        session.add(notif)
        session.commit()
        
        return jsonify({"message": "Request sent successfully"}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@feed_bp.route('/<int:post_id>/likes', methods=['GET'])
def get_post_likes(post_id):
    try:
        session = db_session
        likes = session.query(PostLike).filter(PostLike.post_id == post_id).order_by(PostLike.created_at.desc()).limit(50).all()
        
        users = []
        for l in likes:
            u = session.query(User).filter(User.id == l.user_id).first()
            if u:
                users.append({
                    'id': u.id,
                    'uid': u.uid,
                    'username': u.email.split('@')[0], # derived username
                    'full_name': u.full_name,
                    'avatar_url': u.avatar_url,
                    'title': 'Student' 
                })
        return success_response(users, status=200)
    except Exception as e: return jsonify({"error": str(e)}), 500

@feed_bp.route('/upload_media', methods=['POST'])
def upload_media():
    try:
        # Mock Upload
        return jsonify({"url": f"https://picsum.photos/seed/{random.randint(1,1000)}/400/300"}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@feed_bp.route('/<int:post_id>/comments', methods=['GET'])
def get_post_comments(post_id):
    try:
        session = db_session
        from lib.db.models import Comment, User
        comments = session.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.desc()).all()
        
        # Nested Comments Logic
        comment_map = {}
        roots = []
        
        for c in comments:
             u = c.author
             c_obj = {
                 'id': c.id,
                 'text': c.content,
                 'author_name': u.full_name if u else 'Unknown',
                 'author_avatar': u.avatar_url if u else '',
                 'author_uid': u.uid if u else '',
                 'timestamp': c.created_at.isoformat(),
                 'parent_id': c.parent_id,
                 'replies': []
             }
             comment_map[c.id] = c_obj
        
        for c in comments:
            if c.parent_id:
                if c.parent_id in comment_map:
                    comment_map[c.parent_id]['replies'].append(comment_map[c.id])
            else:
                roots.append(comment_map[c.id])

        return jsonify(roots), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@feed_bp.route('/<int:post_id>/comment', methods=['POST'])
@require_auth
def add_comment(post_id, decoded_token=None):
    try:
        data = request.json
        text = data.get('text')
        parent_id = data.get('parent_id') # Support nested
        
        if not text: return jsonify({"error": "Text required"}), 400

        session = db_session
        uid = decoded_token.get('uid')
        import datetime
        from lib.db.models import User, Comment, Post, Notification
        
        user = session.query(User).filter(User.uid == uid).first()
        if not user: return jsonify({"error": "User not found"}), 404
        
        post = session.query(Post).filter(Post.id == post_id).first()
        if not post: return jsonify({"error": "Post not found"}), 404

        new_comment = Comment(
            post_id=post_id,
            user_id=user.id,
            content=text,
            parent_id=parent_id,
            created_at=datetime.datetime.utcnow()
        )
        session.add(new_comment)
        
        # Interconnectivity
        
        # 1. Bump Post Comments Count
        post.comments_count = (post.comments_count or 0) + 1
        
        # 2. XP Logic
        user.xp_points = (user.xp_points or 0) + 2 # XP for commenting
        
        # 3. Notification Logic
        if post.author_id != user.id:
            n = Notification(
                recipient_id=post.author_id,
                sender_id=user.id,
                type='comment',
                title='New Comment',
                body=f"{user.full_name} commented: {text[:50]}...",
                reference_id=post_id,
                reference_type='post',
                created_at=datetime.datetime.utcnow()
            )
            session.add(n)
            
        # 4. Notify Parent Comment Author (if reply)
        if parent_id:
            parent_c = session.query(Comment).filter(Comment.id == parent_id).first()
            if parent_c and parent_c.author_id != user.id:
                 n_reply = Notification(
                    recipient_id=parent_c.author_id,
                    sender_id=user.id,
                    type='reply',
                    title='New Reply',
                    body=f"{user.full_name} replied to you: {text[:50]}...",
                    reference_id=post_id,
                    reference_type='post',
                    created_at=datetime.datetime.utcnow()
                )
                 session.add(n_reply)

        session.commit()
        
        # Return full comment object for UI to display immediately
        return jsonify({
            "message": "Comment added",
            "comment": {
                'id': new_comment.id,
                'text': new_comment.content,
                'author_name': user.full_name,
                'author_avatar': user.avatar_url,
                'author_uid': user.uid,
                'timestamp': new_comment.created_at.isoformat(),
                'parent_id': new_comment.parent_id,
                'replies': []
            }
        }), 201
    except Exception as e: 
        session.rollback()
        return jsonify({"error": str(e)}), 500

@feed_bp.route('/<int:post_id>/polls/vote', methods=['POST'])
@require_auth
def vote_poll(post_id, decoded_token=None):
    try:
        # Simple Poll Logic: stored in JSON
        # { "options": [{"id": 0, "text": "A", "votes": 10}, ...], "voters": ["uid1", "uid2"] }
        data = request.json
        option_index = data.get('option_index')
        
        session = db_session
        post = session.query(Post).filter(Post.id == post_id).first()
        if not post or not post.poll_data_json: return jsonify({"error": "Poll not found"}), 404
        
        uid = decoded_token.get('uid')
        poll_data = dict(post.poll_data_json) # Copy
        
        # Check if voted
        voters = poll_data.get('voters', [])
        if uid in voters: return jsonify({"error": "Already voted"}), 400
        
        # Register vote
        if 0 <= option_index < len(poll_data['options']):
            poll_data['options'][option_index]['votes'] = poll_data['options'][option_index].get('votes', 0) + 1
            voters.append(uid)
            poll_data['voters'] = voters
            
            # Save back (SQLAlchemy needs explicit reassignment for JSON mutation)
            post.poll_data_json = poll_data
            session.commit()
            return jsonify({"message": "Voted", "poll_data": poll_data}), 200
            
        return jsonify({"error": "Invalid option"}), 400
    except Exception as e: return jsonify({"error": str(e)}), 500
