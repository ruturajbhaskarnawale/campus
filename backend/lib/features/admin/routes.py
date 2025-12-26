from flask import Blueprint, jsonify
from lib.db.database import db_session
from lib.db.models import User, Post, Report

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/stats', methods=['GET'])
def stats():
    try:
        session = db_session
        users = session.query(User).count()
        posts = session.query(Post).count()
        reports = session.query(Report).count()
        return jsonify({'users': users, 'posts': posts, 'reports': reports}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
