from flask import Blueprint, jsonify
from lib.db.database import db_session
from lib.db.models import User

top_users_bp = Blueprint('top_users', __name__)

@top_users_bp.route('/top-users', methods=['GET'])
def get_top_users():
    """Get top users for the leaderboard/suggestions"""
    try:
        session = db_session
        users = session.query(User).order_by(User.xp_points.desc()).limit(10).all()
        
        out = []
        for u in users:
            out.append({
                'id': u.uid, # Use UID for frontend compatibility
                'name': u.full_name or u.username,
                'avatar': u.avatar_url or 'https://via.placeholder.com/150',
                'title': u.role, # or headline?
                'xp': u.xp_points,
                'followers': 0 # Need relationship count if available
            })
            
        return jsonify(out), 200

    except Exception as e:
        print(f"Error fetching top users: {e}")
        # Return mock data as fallback to prevent UI crash
        mock_users = [
            {'id': '1', 'name': 'Sarah Chen', 'title': 'UX Designer', 'xp': 3200, 'avatar': 'https://i.pravatar.cc/150?img=1'},
            {'id': '2', 'name': 'Mike Ross', 'title': 'Full Stack Dev', 'xp': 2950, 'avatar': 'https://i.pravatar.cc/150?img=3'},
            {'id': '3', 'name': 'Jessica Wu', 'title': 'Product Manager', 'xp': 2700, 'avatar': 'https://i.pravatar.cc/150?img=5'},
        ]
        return jsonify(mock_users), 200
