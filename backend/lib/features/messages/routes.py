from flask import Blueprint, request, jsonify
from lib.db.database import db_session
from lib.db.models import User, Conversation, Message, conversation_participants
from lib.core.utils.auth_middleware import require_auth
from datetime import datetime
from sqlalchemy import or_, and_, func

messages_bp = Blueprint('messages', __name__)

@messages_bp.route('/init', methods=['POST'])
@require_auth
def init_conversation(decoded_token=None):
    """
    Find or create a conversation.
    For 1-on-1 (direct): checks if exists.
    For group: creates new.
    """
    try:
        data = request.json
        current_uid = decoded_token.get('uid')
        target_uids = data.get('target_uids', []) # List of UIDs
        type = data.get('type', 'direct') # direct or group
        group_name = data.get('group_name')

        session = db_session
        current_user = session.query(User).filter(User.uid == current_uid).first()
        if not current_user:
            return jsonify({"error": "User not found"}), 404

        # Resolve target users
        participants = [current_user]
        for uid in target_uids:
            u = session.query(User).filter(User.uid == uid).first()
            if u and u.id != current_user.id:
                participants.append(u)
        
        if len(participants) < 2:
            return jsonify({"error": "At least 2 participants required"}), 400

        # 1-on-1 Logic: Check for existing direct conversation
        if type == 'direct' and len(participants) == 2:
            other_user = participants[1]
            
            # We want a conversation that is 'direct' and has EXACTLY these 2 participants.
            # Strategy: Get all conversations for current_user, filter for 'direct', check participants.
            
            user_conversations = session.query(Conversation)\
                .join(Conversation.participants)\
                .filter(Conversation.type == 'direct')\
                .filter(User.id == current_user.id)\
                .all()
                
            existing_id = None
            target_ids = {p.id for p in participants}
            
            for c in user_conversations:
                # Eager load participants if not joined (though they should be accessible)
                # Check participants
                c_p_ids = {p.id for p in c.participants}
                if c_p_ids == target_ids:
                    existing_id = c.id
                    break
            
            if existing_id:
                return jsonify({"conversation_id": existing_id, "is_new": False}), 200

            # If not exists, fall through to create

        # Create New Conversation
        new_convo = Conversation(
            type=type,
            name=group_name if type == 'group' else None,
            created_at=datetime.utcnow(),
            last_message_at=datetime.utcnow()
        )
        
        # Add participants
        new_convo.participants = participants
        session.add(new_convo)
        session.commit()
        
        return jsonify({"conversation_id": new_convo.id, "is_new": True}), 201

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500

@messages_bp.route('/send', methods=['POST'])
@require_auth
def send_message(decoded_token=None):
    try:
        data = request.json
        current_uid = decoded_token.get('uid')
        conversation_id = data.get('conversation_id')
        text = data.get('text')
        
        if not text:
            return jsonify({"error": "Text required"}), 400
            
        session = db_session
        user = session.query(User).filter(User.uid == current_uid).first()
        if not user: return jsonify({"error": "User not found"}), 404

        conversation = None
        if conversation_id:
            conversation = session.query(Conversation).filter(Conversation.id == conversation_id).first()
        
        # If no conversation_id, check if 'to_uid' provided for implied 1-on-1
        if not conversation and data.get('to_uid'):
            target_uid = data.get('to_uid')
            target_user = session.query(User).filter(User.uid == target_uid).first()
            if not target_user:
                return jsonify({"error": "Target user not found"}), 404

            # Reuse init logic (simplified for 1-on-1)
            # Check existing
            user_conversations = session.query(Conversation)\
                .join(Conversation.participants)\
                .filter(Conversation.type == 'direct')\
                .filter(User.id == user.id)\
                .all()
            
            existing_id = None
            target_ids = {user.id, target_user.id}
            
            for c in user_conversations:
                c_p_ids = {p.id for p in c.participants}
                if c_p_ids == target_ids:
                    existing_id = c.id
                    break
            
            if existing_id:
                conversation = session.query(Conversation).get(existing_id)
            else:
                # Create new
                conversation = Conversation(
                    type='direct',
                    created_at=datetime.utcnow(),
                    last_message_at=datetime.utcnow()
                )
                conversation.participants = [user, target_user]
                session.add(conversation)
                session.flush() # Get ID

        if not conversation:
            return jsonify({"error": "Conversation not found"}), 404
            
        # Create Message
        msg = Message(
            conversation_id=conversation.id,
            sender_id=user.id,
            content=text,
            created_at=datetime.utcnow()
        )
        session.add(msg)
        
        # Update Conversation
        conversation.last_message_preview = text[:50]
        conversation.last_message_at = datetime.utcnow()
        
        # Create Notification for Recipient(s)
        # For Direct: other user. For Group: all others.
        from lib.db.models import Notification
        for p in conversation.participants:
            if p.id != user.id:
                notif = Notification(
                    recipient_id=p.id,
                    sender_id=user.id,
                    type='message',
                    title=f"New Message from {user.full_name}",
                    body=text[:100],
                    reference_id=conversation.id,
                    reference_type='conversation',
                    created_at=datetime.utcnow()
                )
                session.add(notif)
        
        session.commit()
        
        return jsonify({
            "message": "Sent",
            "data": {
                "id": msg.id,
                "text": msg.content,
                "senderId": user.uid,
                "timestamp": msg.created_at.isoformat(),
                "type": "text"
            }
        }), 201
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500

@messages_bp.route('/thread/<int:thread_id>', methods=['GET'])
@require_auth
def get_thread(thread_id, decoded_token=None):
    try:
        limit = int(request.args.get('limit', 50))
        session = db_session
        
        msgs = session.query(Message)\
            .filter(Message.conversation_id == thread_id)\
            .order_by(Message.created_at.desc())\
            .limit(limit)\
            .all()
            
        # Get Sender Info Cache
        sender_ids = set([m.sender_id for m in msgs])
        senders = session.query(User).filter(User.id.in_(sender_ids)).all()
        sender_map = {u.id: u for u in senders}
        
        out = []
        for m in msgs:
            u = sender_map.get(m.sender_id)
            out.append({
                "id": m.id,
                "text": m.content,
                "timestamp": m.created_at.isoformat(),
                "senderId": u.uid if u else None,
                "senderName": u.full_name if u else "Unknown",
                "avatar": u.avatar_url if u else None,
                "type": m.type
            })
            
        return jsonify({"messages": out}), 200 # Frontend often expects reverse order or handles it. SQL desc = newest first.
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@messages_bp.route('/threads', methods=['GET'])
@require_auth
def list_threads(decoded_token=None):
    try:
        current_uid = decoded_token.get('uid')
        session = db_session
        user = session.query(User).filter(User.uid == current_uid).first()
        if not user: return jsonify({"error": "User not found"}), 404
        
        # Get all conversations where user is participant
        convos = session.query(Conversation)\
            .join(Conversation.participants)\
            .filter(User.id == user.id)\
            .order_by(Conversation.last_message_at.desc())\
            .all()
            
        out = []
        for c in convos:
            # Determine Name/Avatar
            name = c.name
            avatar = None
            other_uid = None
            
            if c.type == 'direct':
                # Find the other participant
                other = next((p for p in c.participants if p.id != user.id), None)
                if other:
                    name = other.full_name
                    avatar = other.avatar_url
                    other_uid = other.uid
                else:
                    name = "Deleted User"
            elif c.type == 'group':
                avatar = "https://ui-avatars.com/api/?name=" + (name or "Group")
                
            out.append({
                "id": c.id,
                "name": name,
                "avatar": avatar,
                "lastMessage": {
                    "text": c.last_message_preview,
                    "timestamp": c.last_message_at.isoformat() if c.last_message_at else None
                },
                "isGroup": c.type == 'group',
                "otherUid": other_uid
            })

        # Fetch Suggestions (People to chat with)
        suggestions = []
        if len(out) < 5: # If few chats, show suggestions
            suggested_users = session.query(User).filter(User.id != user.id).order_by(func.random()).limit(10).all()
            for u in suggested_users:
                suggestions.append({
                    "uid": u.uid,
                    "name": u.full_name,
                    "avatar": u.avatar_url,
                    "bio": u.bio,
                    "role": u.role
                })
            
        return jsonify({"threads": out, "suggestions": suggestions}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


