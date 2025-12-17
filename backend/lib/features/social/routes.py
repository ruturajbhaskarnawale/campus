from flask import Blueprint, request, jsonify
from lib.core.utils.firebase_config import get_db
from firebase_admin import firestore
import datetime

social_bp = Blueprint('social', __name__)


@social_bp.route('/follow', methods=['POST'])
def follow():
    try:
        data = request.json or {}
        follower = data.get('follower')
        followee = data.get('followee')
        if not follower or not followee:
            return jsonify({"error": "follower and followee required"}), 400

        db = get_db()
        # store both directions for quick lookups
        db.collection('follows').document(f'{follower}_{followee}').set({
            'follower': follower,
            'followee': followee,
            'timestamp': datetime.datetime.now()
        })
        return jsonify({"message": "Followed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@social_bp.route('/unfollow', methods=['POST'])
def unfollow():
    try:
        data = request.json or {}
        follower = data.get('follower')
        followee = data.get('followee')
        if not follower or not followee:
            return jsonify({"error": "follower and followee required"}), 400
        db = get_db()
        db.collection('follows').document(f'{follower}_{followee}').delete()
        return jsonify({"message": "Unfollowed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@social_bp.route('/followers/<user_id>', methods=['GET'])
def followers(user_id):
    try:
        db = get_db()
        results = db.collection('follows').where(filter=firestore.FieldFilter('followee', '==', user_id)).stream()
        out = []
        for r in results:
            rd = r.to_dict()
            ts = rd.get('timestamp')
            if hasattr(ts, 'isoformat'):
                try:
                    rd['timestamp'] = ts.isoformat()
                except Exception:
                    rd['timestamp'] = str(ts)
            out.append(rd)
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@social_bp.route('/following/<user_id>', methods=['GET'])
def following(user_id):
    try:
        db = get_db()
        results = db.collection('follows').where(filter=firestore.FieldFilter('follower', '==', user_id)).stream()
        out = []
        for r in results:
            rd = r.to_dict()
            ts = rd.get('timestamp')
            if hasattr(ts, 'isoformat'):
                try:
                    rd['timestamp'] = ts.isoformat()
                except Exception:
                    rd['timestamp'] = str(ts)
            out.append(rd)
        return jsonify(out), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@social_bp.route('/personalized_feed/<user_id>', methods=['GET'])
def personalized_feed(user_id):
    try:
        db = get_db()
        # Simple personalized feed: posts by people you follow + recent posts
        following_docs = db.collection('follows').where(filter=firestore.FieldFilter('follower', '==', user_id)).stream()
        followees = [d.to_dict().get('followee') for d in following_docs]
        posts_ref = db.collection('posts')
        posts = []
        if followees:
            q = posts_ref.where('author_uid', 'in', followees).limit(20).stream()
            posts = [p.to_dict() for p in q]

        # fallback: latest posts
        if not posts:
            # use Firestore query constant for descending ordering
            posts = [p.to_dict() for p in posts_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(20).stream()]

        # serialize timestamps in posts
        for p in posts:
            ts = p.get('timestamp')
            if hasattr(ts, 'isoformat'):
                try:
                    p['timestamp'] = ts.isoformat()
                except Exception:
                    p['timestamp'] = str(ts)

        return jsonify(posts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
