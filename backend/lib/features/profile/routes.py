from flask import Blueprint, request, jsonify
from lib.core.utils.firebase_config import get_db
from firebase_admin import firestore
import datetime
import random

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/<user_id>/enhanced', methods=['GET'])
def get_enhanced_profile(user_id):
    """
    Get detailed profile with gamification, stats, and badges.
    """
    try:
        db = get_db()
        user_doc = db.collection('users').document(user_id).get()
        
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
            
        user_data = user_doc.to_dict()
        
        # 1. Calculate Real Stats from DB
        projects_ref = db.collection('projects')
        posts_ref = db.collection('posts')

        # Count Projects (Owned)
        my_projects = projects_ref.where('owner', '==', user_id).stream()
        proj_count = len(list(my_projects))

        # Count Posts & Likes
        my_posts = posts_ref.where('author', '==', user_id).stream()
        post_list = list(my_posts)
        post_count = len(post_list)
        
        total_likes = 0
        for p in post_list:
            pd = p.to_dict()
            if 'likes' in pd and isinstance(pd['likes'], int):
                total_likes += pd['likes']
            elif 'likes' in pd and isinstance(pd['likes'], list):
                 total_likes += len(pd['likes']) # If array of uids

        # 2. XP Algorithm
        # Base: 100
        # Project: 50
        # Post: 10
        # Like: 5
        calculated_xp = 100 + (proj_count * 50) + (post_count * 10) + (total_likes * 5)
        
        xp = calculated_xp
        level = int(xp / 1000) + 1
        next_level_xp = level * 1000
        
        # 3. Stats Object
        stats = {
            'views': user_data.get('profile_views', 0),
            'collaborations': proj_count,
            'likes': total_likes,
            'reputation': int(calculated_xp / 10)
        }
        
        # 3. Badges (Mock if not present)
        badges = user_data.get('badges', [
            {'id': 'early_adopter', 'icon': '🚀', 'name': 'Early Adopter'},
            {'id': 'bug_hunter', 'icon': '🐛', 'name': 'Bug Hunter'}
        ])
        
        # 4. Social Links
        socials = user_data.get('socials', {
            'github': 'https://github.com/example',
            'linkedin': 'https://linkedin.com/in/example',
            'website': 'https://portfolio.com'
        })

        enhanced_data = {
            **user_data,
            'level': level,
            'current_xp': xp,
            'next_level_xp': next_level_xp,
            'stats': stats,
            'badges': badges,
            'socials': socials,
            'cover_photo': user_data.get('cover_photo', 'https://via.placeholder.com/800x200/4facfe/ffffff?text=Creator')
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

@profile_bp.route('/<user_id>/skills', methods=['GET'])
def get_skills(user_id):
    try:
        # Mocking detailed skills with endorsement counts
        skills = [
            {'name': 'React Native', 'level': 90, 'endorsements': 12},
            {'name': 'Python', 'level': 85, 'endorsements': 8},
            {'name': 'UI/UX Design', 'level': 70, 'endorsements': 5},
            {'name': 'Firebase', 'level': 60, 'endorsements': 3},
        ]
        return jsonify(skills), 200
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
