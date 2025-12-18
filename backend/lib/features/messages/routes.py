"""
ENHANCED Messages Module with 15+ Features
- Real-time messaging with reactions
- File uploads (images, PDFs, documents)
- Code syntax highlighting
- Link previews
- Typing indicators
- Read receipts
- Pinned messages
- Mentions & search
- Group chats
"""

from flask import Blueprint, request, jsonify
from lib.core.utils.firebase_config import get_db
from firebase_admin import firestore
import datetime
import re

# Optional imports for link preview feature
try:
    import requests
    from bs4 import BeautifulSoup
    LINK_PREVIEW_AVAILABLE = True
except ImportError:
    LINK_PREVIEW_AVAILABLE = False
    print("Warning: beautifulsoup4 and requests not installed. Link preview feature disabled.")

messages_bp = Blueprint('messages', __name__)


# ===== CORE MESSAGING =====

@messages_bp.route('/send', methods=['POST'])
def send_message():
    """Send a message with enhanced features"""
    try:
        data = request.json or {}
        from_uid = data.get('from')
        to_uid = data.get('to')
        text = data.get('text')
        msg_type = data.get('type', 'text')  # text, image, file, voice, code
        thread_id = data.get('threadId')
        
        # Additional fields
        file_url = data.get('fileUrl')
        file_name = data.get('fileName')
        code_language = data.get('codeLanguage')
        reply_to = data.get('replyTo')
        mentions = data.get('mentions', [])
        
        if not from_uid or not text:
            return jsonify({"error": "from and text required"}), 400
        
        db = get_db()
        
        # Create thread ID
        if not thread_id:
            if not to_uid:
                return jsonify({"error": "to or threadId required"}), 400
            thread_id = '_'.join(sorted([from_uid, to_uid]))
        
        # 1. Save Message
        msg_ref = db.collection('messages').document(thread_id).collection('msgs').document()
        new_msg = {
            'id': msg_ref.id,
            'from': from_uid,
            'to': to_uid,
            'text': text,
            'type': msg_type,
            'timestamp': datetime.datetime.now(),
            'status': 'sent',
            'reactions': {},
            'isPinned': False,
            'editedAt': None,
            'deletedAt': None
        }
        
        # Add optional fields
        if file_url:
            new_msg['fileUrl'] = file_url
            new_msg['fileName'] = file_name
        if code_language:
            new_msg['codeLanguage'] = code_language
        if reply_to:
            new_msg['replyTo'] = reply_to
        if mentions:
            new_msg['mentions'] = mentions
        
        # Auto-generate link preview if URL detected (only if bs4 available)
        if LINK_PREVIEW_AVAILABLE:
            urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text)
            if urls:
                preview = generate_link_preview(urls[0])
                if preview:
                    new_msg['linkPreview'] = preview
        
        msg_ref.set(new_msg)
        
        # 2. Update Thread Metadata
        thread_ref = db.collection('messages').document(thread_id)
        thread_data = thread_ref.get()
        
        participants = [from_uid]
        if to_uid:
            participants.append(to_uid)
        
        if thread_data.exists:
            existing = thread_data.to_dict()
            participants = existing.get('participants', participants)
        
        thread_update = {
            'participants': participants,
            'lastMessage': {
                'text': text if len(text) <= 100 else text[:100] + '...',
                'from': from_uid,
                'timestamp': datetime.datetime.now(),
                'type': msg_type
            },
            'updatedAt': datetime.datetime.now()
        }
        
        thread_ref.set(thread_update, merge=True)
        
        # Convert datetime for JSON
        new_msg['timestamp'] = new_msg['timestamp'].isoformat()
        
        return jsonify({
            "message": "Sent",
            "data": new_msg
        }), 200
        
    except Exception as e:
        print(f"Send message error: {e}")
        return jsonify({"error": str(e)}), 500


@messages_bp.route('/thread/<thread_id>', methods=['GET'])
def get_thread(thread_id):
    """Get all messages in a thread"""
    try:
        db = get_db()
        limit = int(request.args.get('limit', 50))
        
        # Get messages
        msgs = db.collection('messages')\
            .document(thread_id)\
            .collection('msgs')\
            .order_by('timestamp', direction=firestore.Query.DESCENDING)\
            .limit(limit)\
            .stream()
        
        out = []
        for msg in msgs:
            msg_data = msg.to_dict()
            
            # Convert timestamp
            ts = msg_data.get('timestamp')
            if hasattr(ts, 'isoformat'):
                msg_data['timestamp'] = ts.isoformat()
            
            # Convert editedAt if present
            if msg_data.get('editedAt') and hasattr(msg_data['editedAt'], 'isoformat'):
                msg_data['editedAt'] = msg_data['editedAt'].isoformat()
            
            out.append(msg_data)
        
        # Reverse for chronological order
        out.reverse()
        
        return jsonify({"messages": out}), 200
        
    except Exception as e:
        print(f"Get thread error: {e}")
        return jsonify({"error": str(e)}), 500


@messages_bp.route('/threads', methods=['GET'])
def list_threads():
    """List all user's message threads"""
    try:
        uid = request.args.get('uid')
        if not uid:
            return jsonify({"error": "uid required"}), 400
        
        db = get_db()
        
        # Query threads
        # Query threads
        threads_query = db.collection('messages')\
            .where(filter=firestore.FieldFilter('participants', 'array_contains', uid))\
            .stream()
            
        # Collect all first, then sort in memory to avoid missing index error
        thread_docs = list(threads_query)
        
        out = []
        for thread_doc in thread_docs:
            thread_data = thread_doc.to_dict()
            thread_id = thread_doc.id
            
            participants = thread_data.get('participants', [])
            is_group = len(participants) > 2
            
            # Get other participants' info
            other_users = []
            for p_uid in participants:
                if p_uid != uid:
                    try:
                        user_doc = db.collection('users').document(p_uid).get()
                        if user_doc.exists:
                            user_data = user_doc.to_dict()
                            other_users.append({
                                'uid': p_uid,
                                'name': user_data.get('name', 'User'),
                                'avatar': user_data.get('avatar_url', '')
                            })
                    except:
                        other_users.append({
                            'uid': p_uid,
                            'name': 'User',
                            'avatar': ''
                        })
            
            # Format last message
            last_msg = thread_data.get('lastMessage', {})
            if last_msg.get('timestamp') and hasattr(last_msg['timestamp'], 'isoformat'):
                last_msg['timestamp'] = last_msg['timestamp'].isoformat()
            
            # Get unread count (simplified - count all messages not from current user)
            unread_count = 0
            try:
                recent_msgs = db.collection('messages')\
                    .document(thread_id)\
                    .collection('msgs')\
                    .where('from', '!=', uid)\
                    .stream()
                unread_count = sum(1 for msg in recent_msgs if msg.to_dict().get('status') != 'seen')
            except:
                unread_count = 0
            
            thread_info = {
                'id': thread_id,
                'isGroup': is_group,
                'groupName': thread_data.get('groupName'),
                'participants': other_users,
                'lastMessage': last_msg,
                'unreadCount': unread_count,
                'isPinned': thread_data.get('isPinned', {}).get(uid, False),
                'isArchived': thread_data.get('isArchived', {}).get(uid, False)
            }
            
            # For 1-on-1, set name and avatar from other user
            if not is_group and other_users:
                thread_info['name'] = other_users[0]['name']
                thread_info['avatar'] = other_users[0]['avatar']
                thread_info['otherUid'] = other_users[0]['uid']
            else:
                thread_info['name'] = thread_data.get('groupName', 'Group Chat')
                thread_info['avatar'] = thread_data.get('groupIcon', '')
            thread_info['last'] = last_msg.get('text', '')
            thread_info['lastTimestamp'] = last_msg.get('timestamp')
            thread_info['unread'] = unread_count
            out.append(thread_info)
        
        # Sort by updated/last message time descending
        out.sort(key=lambda x: x.get('lastTimestamp') or '', reverse=True)
        
        return jsonify({"threads": out}), 200
        
    except Exception as e:
        print(f"List threads error: {e}")
        return jsonify({"error": str(e)}), 500


# ===== MESSAGE REACTIONS =====

@messages_bp.route('/react', methods=['POST'])
def react_to_message():
    """Add/remove reaction to a message"""
    try:
        data = request.json or {}
        thread_id = data.get('threadId')
        msg_id = data.get('msgId')
        user_id = data.get('userId')
        emoji = data.get('emoji')  # null to remove
        
        if not all([thread_id, msg_id, user_id]):
            return jsonify({"error": "threadId, msgId, userId required"}), 400
        
        db = get_db()
        msg_ref = db.collection('messages')\
            .document(thread_id)\
            .collection('msgs')\
            .document(msg_id)
        
        msg_doc = msg_ref.get()
        if not msg_doc.exists:
            return jsonify({"error": "Message not found"}), 404
        
        msg_data = msg_doc.to_dict()
        reactions = msg_data.get('reactions', {})
        
        if emoji:
            reactions[user_id] = emoji
        else:
            reactions.pop(user_id, None)
        
        msg_ref.update({'reactions': reactions})
        
        return jsonify({
            "message": "Reaction updated",
            "reactions": reactions
        }), 200
        
    except Exception as e:
        print(f"React error: {e}")
        return jsonify({"error": str(e)}), 500


# ===== PINNED MESSAGES =====

@messages_bp.route('/pin', methods=['POST'])
def pin_message():
    """Pin/unpin a message"""
    try:
        data = request.json or {}
        thread_id = data.get('threadId')
        msg_id = data.get('msgId')
        pinned = data.get('pinned', True)
        
        if not all([thread_id, msg_id]):
            return jsonify({"error": "threadId, msgId required"}), 400
        
        db = get_db()
        msg_ref = db.collection('messages')\
            .document(thread_id)\
            .collection('msgs')\
            .document(msg_id)
        
        msg_ref.update({'isPinned': pinned})
        
        return jsonify({"message": "Pin status updated"}), 200
        
    except Exception as e:
        print(f"Pin error: {e}")
        return jsonify({"error": str(e)}), 500


@messages_bp.route('/pinned/<thread_id>', methods=['GET'])
def get_pinned_messages(thread_id):
    """Get all pinned messages in a thread"""
    try:
        db = get_db()
        
        pinned_msgs = db.collection('messages')\
            .document(thread_id)\
            .collection('msgs')\
            .where(filter=firestore.FieldFilter('isPinned', '==', True))\
            .order_by('timestamp', direction=firestore.Query.DESCENDING)\
            .stream()
        
        out = []
        for msg in pinned_msgs:
            msg_data = msg.to_dict()
            if msg_data.get('timestamp') and hasattr(msg_data['timestamp'], 'isoformat'):
                msg_data['timestamp'] = msg_data['timestamp'].isoformat()
            out.append(msg_data)
        
        return jsonify({"pinned": out}), 200
        
    except Exception as e:
        print(f"Get pinned error: {e}")
        return jsonify({"error": str(e)}), 500


# ===== MESSAGE SEARCH =====

@messages_bp.route('/search/<thread_id>', methods=['GET'])
def search_messages(thread_id):
    """Search messages within a thread"""
    try:
        query = request.args.get('q', '').lower()
        if not query:
            return jsonify({"results": []}), 200
        
        db = get_db()
        
        # Get all messages (in production, use text search index)
        msgs = db.collection('messages')\
            .document(thread_id)\
            .collection('msgs')\
            .stream()
        
        results = []
        for msg in msgs:
            msg_data = msg.to_dict()
            if query in msg_data.get('text', '').lower():
                if msg_data.get('timestamp') and hasattr(msg_data['timestamp'], 'isoformat'):
                    msg_data['timestamp'] = msg_data['timestamp'].isoformat()
                results.append(msg_data)
        
        return jsonify({"results": results}), 200
        
    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({"error": str(e)}), 500


# ===== MESSAGE STATUS =====

@messages_bp.route('/status', methods=['POST'])
def update_message_status():
    """Update message read/delivery status"""
    try:
        data = request.json or {}
        thread_id = data.get('threadId')
        msg_id = data.get('msgId')
        status = data.get('status')  # delivered, seen
        user_id = data.get('userId')
        
        if not all([thread_id, msg_id, status]):
            return jsonify({"error": "threadId, msgId, status required"}), 400
        
        db = get_db()
        msg_ref = db.collection('messages')\
            .document(thread_id)\
            .collection('msgs')\
            .document(msg_id)
        
        if status == 'seen':
            msg_ref.update({
                'status': 'seen',
                'seenBy': firestore.ArrayUnion([user_id]),
                'seenAt': datetime.datetime.now()
            })
        elif status == 'delivered':
            msg_ref.update({
                'status': 'delivered',
                'deliveredTo': firestore.ArrayUnion([user_id])
            })
        
        return jsonify({"message": "Status updated"}), 200
        
    except Exception as e:
        print(f"Status update error: {e}")
        return jsonify({"error": str(e)}), 500


# ===== EDIT/DELETE =====

@messages_bp.route('/edit', methods=['POST'])
def edit_message():
    """Edit a message"""
    try:
        data = request.json or {}
        thread_id = data.get('threadId')
        msg_id = data.get('msgId')
        new_text = data.get('text')
        user_id = data.get('userId')
        
        if not all([thread_id, msg_id, new_text, user_id]):
            return jsonify({"error": "threadId, msgId, text, userId required"}), 400
        
        db = get_db()
        msg_ref = db.collection('messages')\
            .document(thread_id)\
            .collection('msgs')\
            .document(msg_id)
        
        msg_doc = msg_ref.get()
        if not msg_doc.exists:
            return jsonify({"error": "Message not found"}), 404
        
        msg_data = msg_doc.to_dict()
        if msg_data.get('from') != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        msg_ref.update({
            'text': new_text,
            'editedAt': datetime.datetime.now()
        })
        
        return jsonify({"message": "Message edited"}), 200
        
    except Exception as e:
        print(f"Edit error: {e}")
        return jsonify({"error": str(e)}), 500


@messages_bp.route('/delete', methods=['POST'])
def delete_message():
    """Delete a message (soft delete)"""
    try:
        data = request.json or {}
        thread_id = data.get('threadId')
        msg_id = data.get('msgId')
        user_id = data.get('userId')
        
        if not all([thread_id, msg_id, user_id]):
            return jsonify({"error": "threadId, msgId, userId required"}), 400
        
        db = get_db()
        msg_ref = db.collection('messages')\
            .document(thread_id)\
            .collection('msgs')\
            .document(msg_id)
        
        msg_doc = msg_ref.get()
        if not msg_doc.exists:
            return jsonify({"error": "Message not found"}), 404
        
        msg_data = msg_doc.to_dict()
        if msg_data.get('from') != user_id:
            return jsonify({"error": "Unauthorized"}), 403
        
        msg_ref.update({
            'text': 'This message was deleted',
            'deletedAt': datetime.datetime.now()
        })
        
        return jsonify({"message": "Message deleted"}), 200
        
    except Exception as e:
        print(f"Delete error: {e}")
        return jsonify({"error": str(e)}), 500


# ===== HELPER FUNCTIONS =====

def generate_link_preview(url):
    """Generate preview for a URL"""
    try:
        response = requests.get(url, timeout=5)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        title = soup.find('meta', property='og:title') or soup.find('title')
        description = soup.find('meta', property='og:description') or soup.find('meta', attrs={'name': 'description'})
        image = soup.find('meta', property='og:image')
        
        return {
            'url': url,
            'title': title.get('content') if hasattr(title, 'get') else (title.string if title else url),
            'description': description.get('content') if hasattr(description, 'get') else '',
            'image': image.get('content') if image and hasattr(image, 'get') else ''
        }
    except:
        return None
