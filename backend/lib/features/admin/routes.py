from flask import Blueprint, request, jsonify
from lib.core.utils.firebase_config import get_db

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/stats', methods=['GET'])
def stats():
    try:
        db = get_db()
        users = len(list(db.collection('users').stream()))
        posts = len(list(db.collection('posts').stream()))
        reports = len(list(db.collection('reports').stream()))
        return jsonify({'users': users, 'posts': posts, 'reports': reports}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
