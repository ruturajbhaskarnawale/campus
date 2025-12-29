
from flask import Blueprint, request, jsonify
from lib.db.database import db_session
from lib.db.models import AppSettings, User
from lib.core.utils.auth_middleware import require_auth
import datetime

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('', methods=['GET'])
@require_auth
def get_settings(decoded_token=None):
    try:
        session = db_session
        uid = decoded_token.get('uid')
        user = session.query(User).filter(User.uid == uid).first()
        if not user: return jsonify({"error": "User not found"}), 404
        
        settings = session.query(AppSettings).filter(AppSettings.user_id == user.id).first()
        if not settings:
             # Create defaults
             settings = AppSettings(user_id=user.id)
             session.add(settings)
             session.commit()
             
        return jsonify({
            'theme': settings.theme,
            'language': settings.language,
            'push_notifications': settings.push_notifications
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@settings_bp.route('', methods=['PUT'])
@require_auth
def update_settings(decoded_token=None):
    try:
        session = db_session
        uid = decoded_token.get('uid')
        user = session.query(User).filter(User.uid == uid).first()
        if not user: return jsonify({"error": "User not found"}), 404
        
        settings = session.query(AppSettings).filter(AppSettings.user_id == user.id).first()
        if not settings:
             settings = AppSettings(user_id=user.id)
             session.add(settings)
        
        data = request.json
        if 'theme' in data: settings.theme = data['theme']
        if 'language' in data: settings.language = data['language']
        if 'push_notifications' in data: settings.push_notifications = data['push_notifications']
        
        settings.updated_at = datetime.datetime.utcnow()
        session.commit()
        
        return jsonify({"message": "Settings updated"}), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
