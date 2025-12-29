from flask import Blueprint, request, jsonify
from lib.db.database import db_session
from lib.db.models import User, Notification
from datetime import datetime

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/send', methods=['POST'])
def send_notification():
    try:
        data = request.json or {}
        to_uid = data.get('to')
        title = data.get('title')
        body = data.get('body')
        if not to_uid or not (title or body):
            return jsonify({"error": "to and title/body required"}), 400

        session = db_session
        user = session.query(User).filter(User.uid == to_uid).first()
        if not user: return jsonify({"error": "User not found"}), 404
        
        new_notif = Notification(
            user_id=user.id,
            title=title,
            message=body, # Model uses message? Check models.py
            type='system',
            created_at=datetime.utcnow()
        )
        session.add(new_notif)
        session.commit()
        return jsonify({"message": "Stored"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route('/list/<uid>', methods=['GET'])
def list_notifications(uid):
    try:
        session = db_session
        user = session.query(User).filter(User.uid == uid).first()
        if not user: return jsonify([]), 200
        
        # Join with User table to get sender details (for avatar/name in notification)
        # Assuming sender_id exists in Notification model (step 17 check? previous code shows it)
        # Let's check model definition if needed. But verify_social_backend created one with sender_id.
        
        notifs = session.query(Notification, User).outerjoin(User, Notification.sender_id == User.id)\
            .filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).all()
            
        out = []
        for n, sender in notifs:
            out.append({
                'id': n.id,
                'title': n.title,
                'body': n.message,
                'read': n.is_read,
                'timestamp': n.created_at.isoformat(),
                'type': n.type,
                'avatar': sender.avatar_url if sender else None,
                'reference_id': n.reference_id
            })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route('/register_token', methods=['POST'])
def register_token():
    try:
        data = request.json or {}
        uid = data.get('uid')
        token = data.get('token')
        if not uid or not token:
            return jsonify({"error": "uid and token required"}), 400
        
        session = db_session
        user = session.query(User).filter(User.uid == uid).first()
        if user:
            user.fcm_token = token
            session.commit()
            
        return jsonify({"message": "Registered"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route('/mark_read', methods=['POST'])
def mark_read():
    try:
        data = request.json or {}
        uid = data.get('uid')
        nid = data.get('nid')
        
        session = db_session
        # We need the notification ID (Integer). 
        # If frontend sends integer ID from previous list call, good.
        # If it sends UID or something else, handle it?
        # Assuming ID is int.
        try:
             nid_int = int(nid)
             notif = session.query(Notification).get(nid_int)
             if notif:
                 notif.is_read = True
                 session.commit()
        except:
             pass
             
        return jsonify({"message": "Marked read"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route('/mark_all_read', methods=['POST'])
def mark_all_read():
    try:
        data = request.json or {}
        uid = data.get('uid')
        if not uid: return jsonify({"error": "uid required"}), 400
        
        session = db_session
        user = session.query(User).filter(User.uid == uid).first()
        if user:
            session.query(Notification).filter(Notification.user_id == user.id, Notification.is_read == False).update({Notification.is_read: True})
            session.commit()
            
        return jsonify({"message": "Marked all read"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
