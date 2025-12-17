from flask import Blueprint, request, jsonify
from lib.core.utils.firebase_config import get_db
from firebase_admin import firestore
import datetime

moderation_bp = Blueprint('moderation', __name__)


@moderation_bp.route('/report', methods=['POST'])
def report():
    try:
        data = request.json or {}
        reporter = data.get('reporter')
        target_type = data.get('type')  # 'post' or 'user' or 'comment'
        target_id = data.get('target_id')
        reason = data.get('reason')
        if not reporter or not target_type or not target_id or not reason:
            return jsonify({"error": "reporter,type,target_id,reason required"}), 400
        db = get_db()
        rep_ref = db.collection('reports').document()
        rep_ref.set({'reporter': reporter,'type': target_type,'target_id': target_id,'reason': reason,'timestamp': datetime.datetime.now(),'status':'open'})
        return jsonify({"message": "Reported"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@moderation_bp.route('/reports', methods=['GET'])
def list_reports():
    try:
        db = get_db()
        res = db.collection('reports').order_by('timestamp', direction=firestore.Query.DESCENDING).stream()
        out = []
        for r in res:
            d = r.to_dict()
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


@moderation_bp.route('/reports/<report_id>/resolve', methods=['POST'])
def resolve(report_id):
    try:
        data = request.json or {}
        action = data.get('action')
        db = get_db()
        ref = db.collection('reports').document(report_id)
        ref.update({'status':'resolved','action':action,'resolved_at': datetime.datetime.now()})
        return jsonify({"message": "Resolved"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
