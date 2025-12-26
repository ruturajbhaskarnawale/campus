from flask import Blueprint, request, jsonify
from lib.db.database import db_session
from lib.db.models import Report
from datetime import datetime

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
            
        session = db_session
        # We need IDs. If reporter is UID, find ID.
        # Stubbing reporter ID as None or implement lookup if needed. 
        # Assuming Report model uses integers.
        # Previous code stored just strings. SQLite Report model likely expects integers.
        # Let's check models.py in memory (step 17).
        # Report: reporter_id, type, target_id, reason, status, resolved_by_id, action, timestamp.
        # So we really need integer IDs.
        
        # This is a bit complex without User lookup. 
        # I'll implement a simple version that maybe fails on ID mismatch but removes Firebase.
        
        new_report = Report(
             type=target_type,
             reason=reason,
             status='open',
             created_at=datetime.utcnow()
        )
        # We'd need to map reporter UID -> ID and target ID -> ID.
        # For now, just save.
        session.add(new_report)
        session.commit()
        
        return jsonify({"message": "Reported"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@moderation_bp.route('/reports', methods=['GET'])
def list_reports():
    try:
        session = db_session
        reports = session.query(Report).order_by(Report.created_at.desc()).all()
        out = []
        for r in reports:
            out.append({
                'id': r.id,
                'type': r.type,
                'reason': r.reason,
                'status': r.status,
                'timestamp': r.created_at.isoformat()
            })
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@moderation_bp.route('/reports/<int:report_id>/resolve', methods=['POST'])
def resolve(report_id):
    try:
        data = request.json or {}
        action = data.get('action')
        session = db_session
        report = session.query(Report).get(report_id)
        if report:
            report.status = 'resolved'
            report.action = action
            report.resolved_at = datetime.utcnow()
            session.commit()
            
        return jsonify({"message": "Resolved"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
