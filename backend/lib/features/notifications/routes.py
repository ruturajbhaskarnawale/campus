from flask import Blueprint, request, jsonify
from lib.core.utils.firebase_config import get_db
from firebase_admin import firestore
import datetime

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

        db = get_db()
        notif_ref = db.collection('users').document(to_uid).collection('notifications').document()
        notif_ref.set({
            'title': title,
            'body': body,
            'read': False,
            'timestamp': datetime.datetime.now()
        })
        return jsonify({"message": "Stored"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route('/list/<uid>', methods=['GET'])
def list_notifications(uid):
    try:
        db = get_db()
        # order descending using Firestore constant
        results = db.collection('users').document(uid).collection('notifications').order_by('timestamp', direction=firestore.Query.DESCENDING).stream()
        out = []
        for r in results:
            d = r.to_dict()
            # convert timestamp to ISO string for JSON serialization
            ts = d.get('timestamp')
            if hasattr(ts, 'isoformat'):
                try:
                    d['timestamp'] = ts.isoformat()
                except Exception:
                    d['timestamp'] = str(ts)
            out.append(d)
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
        db = get_db()
        db.collection('fcm_tokens').document(uid).set({'token': token, 'updated': datetime.datetime.now()})
        return jsonify({"message": "Registered"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route('/mark_read', methods=['POST'])
def mark_read():
    try:
        data = request.json or {}
        uid = data.get('uid')
        nid = data.get('nid')
        if not uid or not nid:
            return jsonify({"error": "uid and nid required"}), 400
        
        db = get_db()
        db.collection('users').document(uid).collection('notifications').document(nid).update({'read': True})
        return jsonify({"message": "Marked read"}), 200
    except Exception as e:
        # If document not found, just return success or 404, but don't 500
        if 'NotFound' in str(e) or 'No document to update' in str(e):
             return jsonify({"message": "Notification not found or already deleted"}), 404
        return jsonify({"error": str(e)}), 500


@notifications_bp.route('/mark_all_read', methods=['POST'])
def mark_all_read():
    try:
        data = request.json or {}
        uid = data.get('uid')
        if not uid:
            return jsonify({"error": "uid required"}), 400
        
        db = get_db()
        # Batch update (limit 500)
        batch = db.batch()
        notifs = db.collection('users').document(uid).collection('notifications').where(filter=firestore.FieldFilter('read', '==', False)).stream()
        
        count = 0
        for n in notifs:
            batch.update(n.reference, {'read': True})
            count += 1
            if count >= 400: # safety limit per batch
                break
        
        if count > 0:
            batch.commit()
            
        return jsonify({"message": f"Marked {count} notifications as read"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
