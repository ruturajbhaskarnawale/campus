from flask import Blueprint, request, jsonify
from lib.db.database import db_session
from lib.db.models import User, Follow, Post
from sqlalchemy import desc

social_bp = Blueprint('social', __name__)

@social_bp.route('/follow', methods=['POST'])
def follow():
    try:
        data = request.json or {}
        follower_uid = data.get('follower')
        followee_uid = data.get('followee')
        if not follower_uid or not followee_uid:
            return jsonify({"error": "follower and followee required"}), 400

        if follower_uid == followee_uid:
            return jsonify({"error": "Cannot follow yourself"}), 400

        session = db_session
        follower = session.query(User).filter(User.uid == follower_uid).first()
        followee = session.query(User).filter(User.uid == followee_uid).first()
        
        if not follower or not followee:
             return jsonify({"error": "User not found"}), 404

        existing = session.query(Follow).filter(Follow.follower_id == follower.id, Follow.followed_id == followee.id).first()
        if not existing:
            new_follow = Follow(follower_id=follower.id, followed_id=followee.id)
            session.add(new_follow)
            
            # Safe increment
            follower.following_count = (follower.following_count or 0) + 1
            followee.followers_count = (followee.followers_count or 0) + 1
            
            session.commit()
            return jsonify({"message": "Followed", "status": "following"}), 200
        else:
            return jsonify({"message": "Already following", "status": "following"}), 200
            
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500


@social_bp.route('/unfollow', methods=['POST'])
def unfollow():
    try:
        data = request.json or {}
        follower_uid = data.get('follower')
        followee_uid = data.get('followee')
        
        session = db_session
        follower = session.query(User).filter(User.uid == follower_uid).first()
        followee = session.query(User).filter(User.uid == followee_uid).first()
        
        if follower and followee:
            # Check if follows first to avoid negative counts on double unfollow (though UI prevents usually)
            existing = session.query(Follow).filter(Follow.follower_id == follower.id, Follow.followed_id == followee.id).first()
            if existing:
                session.delete(existing)
                
                # Update counts
                follower.following_count = max(0, (follower.following_count or 0) - 1)
                followee.followers_count = max(0, (followee.followers_count or 0) - 1)
                
                session.commit()
            
        return jsonify({"message": "Unfollowed"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500


@social_bp.route('/followers/<user_id>', methods=['GET'])
def followers(user_id):
    try:
        session = db_session
        user = session.query(User).filter(User.uid == user_id).first()
        if not user: return jsonify([]), 200
        
        follows = session.query(Follow).filter(Follow.followed_id == user.id).all()
        # Fetch follower details
        out = []
        for f in follows:
             u = session.query(User).get(f.follower_id)
             if u:
                 out.append({
                     'follower': u.uid,
                     'followee': user_id,
                     'timestamp': f.created_at.isoformat()
                 })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@social_bp.route('/following/<user_id>', methods=['GET'])
def following(user_id):
    try:
        session = db_session
        user = session.query(User).filter(User.uid == user_id).first()
        if not user: return jsonify([]), 200

        follows = session.query(Follow).filter(Follow.follower_id == user.id).all()
        out = []
        for f in follows:
             u = session.query(User).get(f.followed_id)
             if u:
                 out.append({
                     'follower': user_id,
                     'followee': u.uid,
                     'timestamp': f.created_at.isoformat()
                 })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@social_bp.route('/personalized_feed/<user_id>', methods=['GET'])
def personalized_feed(user_id):
    try:
        session = db_session
        user = session.query(User).filter(User.uid == user_id).first()
        if not user: return jsonify([]), 200
        
        # Get IDs of people user follows
        followed_ids = [f.followed_id for f in session.query(Follow).filter(Follow.follower_id == user.id).all()]
        
        # Fetch posts from followed users + own posts? Or just followed.
        # Fallback to recent if empty
        
        if followed_ids:
            posts = session.query(Post).filter(Post.author_id.in_(followed_ids)).order_by(Post.created_at.desc()).limit(20).all()
        else:
            posts = []
            
        if not posts:
             posts = session.query(Post).order_by(Post.created_at.desc()).limit(20).all()
             
        out = []
        for p in posts:
            author = p.author
            out.append({
                'id': p.id,
                'title': p.title,
                'description': p.content, # Model uses content or description? 'content' in Post usually. 'description' in previous code?
                # Need to check Post model. Assuming 'content' or matching previous logic.
                # Previous code used: p.to_dict() which mimics model.
                # Post model in step 17 has 'content', 'title', 'media_urls'.
                'content': p.content,
                'author_uid': author.uid,
                'timestamp': p.created_at.isoformat()
            })
            
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
