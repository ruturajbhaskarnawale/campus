from flask import Blueprint, request, jsonify
from lib.db.database import db_session
from lib.db.models import User, Post, Project, Follow, Skill
import datetime
import random

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/<user_id>/enhanced', methods=['GET'])
def get_enhanced_profile(user_id):
    try:
        session = db_session
        user = session.query(User).filter(User.uid == user_id).first()
        
        if not user:
             return jsonify({"error": "User not found"}), 404
             
        # 1. Stats & Dynamic Counts
        proj_count = session.query(Project).filter(Project.owner_id == user.id).count() or 0
        post_count = session.query(Post).filter(Post.author_id == user.id).count() or 0
        followers_real = session.query(Follow).filter(Follow.followed_id == user.id).count()
        following_real = session.query(Follow).filter(Follow.follower_id == user.id).count()
        
        # Likes calc
        total_likes = 0
        user_posts = session.query(Post).filter(Post.author_id == user.id).all()
        for p in user_posts:
            total_likes += (p.likes_count or 0)

        # Fetch Projects
        projects_db = session.query(Project).filter(Project.owner_id == user.id).all()
        projects_list = []
        for p in projects_db:
             projects_list.append({
                 'id': p.id,
                 'title': p.post.title if p.post else "Project", # fallback title
                 'desc': p.post.content_body if p.post else "No description", 
                 'status': p.status,
                 'image': p.post.media_urls_json[0] if (p.post and p.post.media_urls_json) else None,
                 'demo_url': p.demo_url,
                 'repo_url': p.repository_url
             })

        # 2. XP Logic
        calculated_xp = 100 + (proj_count * 50) + (post_count * 10) + (total_likes * 5)
        current_xp = user.xp_points if user.xp_points else calculated_xp
        
        level = int(current_xp / 1000) + 1
        
        stats = {
            'views': user.views_count if hasattr(user, 'views_count') else 0, 
            'collaborations': proj_count,
            'likes': total_likes,
            'followers': followers_real,
            'following': following_real,
            'reputation': int(current_xp / 10)
        }
        
        # Default mock badges if none
        badges = [
             {'id': 'early', 'icon': '🚀', 'name': 'Early Adopter'}
        ]
        
        socials = {
            'github': user.github_url,
            'linkedin': user.linkedin_url,
            'website': user.website_url
        }

        enhanced_data = {
            'uid': user.uid,
            'name': user.full_name,
            'bio': user.bio,
            'avatar_url': user.avatar_url,
            'cover_photo': user.cover_photo_url,
            'level': level,
            'current_xp': current_xp,
            'next_level_xp': level * 1000,
            'stats': stats,
            'badges': badges,
            'socials': socials,
            'skills': [s.name for s in user.skills],
            'projects': projects_list
        }
        
        return jsonify(enhanced_data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@profile_bp.route('/<user_id>/activity', methods=['GET'])
def get_activity_feed(user_id):
    try:
        # returns mock activity feed for now
        # In production, query a 'activities' collection
        activities = [
            {'id': '1', 'type': 'project', 'text': 'Launched a new project: CampusHub', 'time': '2h ago', 'icon': 'rocket'},
            {'id': '2', 'type': 'comment', 'text': 'Commented on React Native performance guide', 'time': '5h ago', 'icon': 'chatbubble'},
            {'id': '3', 'type': 'badge', 'text': 'Earned "Top Contributor" badge', 'time': '1d ago', 'icon': 'medal'},
            {'id': '4', 'type': 'follow', 'text': 'Started following Sarah Jones', 'time': '2d ago', 'icon': 'person-add'},
        ]
        return jsonify(activities), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@profile_bp.route('/<user_id>/contributions', methods=['GET'])
def get_contribution_graph(user_id):
    """
    Generate mock data for contribution heatmap (last 365 days)
    """
    try:
        data = {}
        today = datetime.date.today()
        # random data for last 90 days
        for i in range(90):
            date = today - datetime.timedelta(days=i)
            # 30% chance of activity
            if random.random() > 0.7:
                count = random.randint(1, 5)
                data[date.isoformat()] = count
        
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@profile_bp.route('/<user_id>', methods=['GET'])
def get_profile(user_id):
    try:
        session = db_session
        user = session.query(User).filter(User.uid == user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        return jsonify({
            'uid': user.uid,
            'name': user.full_name,
            'username': user.username,
            'avatar': user.avatar_url,
            'bio': user.bio,
            'role': user.role,
            'followers_count': user.followers_count,
            'following_count': user.following_count,
            'cover_photo': user.cover_photo_url,
            'github_url': user.github_url,
            'linkedin_url': user.linkedin_url,
            'website_url': user.website_url,
            'xp_points': user.xp_points
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@profile_bp.route('/<user_id>/skills', methods=['GET'])
def get_skills(user_id):
    try:
        session = db_session
        user = session.query(User).filter(User.uid == user_id).first()
        if not user: return jsonify([]), 200
        
        enriched = []
        # Query UserSkills junction for level/endorsements
        # For now just use the relationship list
        for s in user.skills:
             enriched.append({
                 'name': s.name,
                 'level': 50, # mock or fetch from junction
                 'endorsements': s.popularity_count
             })
             
        return jsonify(enriched), 200
    except Exception as e:
         return jsonify({"error": str(e)}), 500

@profile_bp.route('/endorse', methods=['POST'])
def endorse_skill():
    try:
        data = request.json or {}
        user_id = data.get('userId')
        skill_name = data.get('skill')
        endorser_id = data.get('endorserId')
        
        # Logic to update Firestore would go here
        # db.collection('users').document(user_id).update(...)
        
        return jsonify({"message": f"Endorsed {skill_name}"}), 200
    except Exception as e:
         return jsonify({"error": str(e)}), 500
