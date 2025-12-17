from flask import Blueprint, request, jsonify
from lib.core.utils.firebase_config import get_db
from firebase_admin import auth

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')

        # WINNING FEATURE: Verify Student Status
        # Change '.edu' to your college domain if needed (e.g., 'gmail.com' for testing now)
        if not email or not email.endswith('.edu'): 
             return jsonify({"error": "Registration restricted to university students (.edu email required)"}), 403

        # 1. Create User in Firebase Auth
        user = auth.create_user(
            email=email,
            password=password,
            display_name=name
        )

        # 2. Create User Profile in Firestore (Database)
        db = get_db()
        db.collection('users').document(user.uid).set({
            'name': name,
            'email': email,
            'skills': [], # Empty for now, will add later
            'github_link': ''
        })

        return jsonify({"message": "User registered successfully", "uid": user.uid}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@auth_bp.route('/login', methods=['POST'])
def login():
    # In a real app, Client sends a token. For this MVP, we will simulate 
    # login verification or use Firebase Client SDK on frontend.
    # For now, we will just return a success message to test the API connection.
    return jsonify({"message": "Login logic will be handled by Frontend Firebase SDK"}), 200


@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    try:
        # Priority: Check Authorization header first (set by axios interceptor)
        id_token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            id_token = auth_header.split('Bearer ')[1].strip()
        
        # Fallback: check request body
        if not id_token:
            data = request.json or {}
            id_token = data.get('idToken')

        if not id_token or id_token == '':
            return jsonify({"error": "Missing ID token"}), 401

        # Verify the token with Firebase
        decoded = auth.verify_id_token(id_token)
        uid = decoded.get('uid')

        # Ensure user profile exists in Firestore
        db = get_db()
        user_doc = db.collection('users').document(uid)
        doc = user_doc.get()
        if not doc.exists:
            # Create an initial profile from token claims
            display_name = decoded.get('name') or decoded.get('email', '').split('@')[0]
            email = decoded.get('email')
            user_doc.set({
                'name': display_name,
                'email': email,
                'skills': [],
                'github_link': '',
                'bio': '',
                'avatar_url': ''
            })

        # Return full profile with stats
        profile = user_doc.get().to_dict()
        profile['uid'] = uid
        
        # Get post count
        try:
            posts_query = db.collection('posts').where(filter=firestore.FieldFilter('author_uid', '==', uid)).stream()
            profile['postsCount'] = sum(1 for _ in posts_query)
        except Exception:
            profile['postsCount'] = 0
            
        # Get followers/following count
        try:
            followers = db.collection('follows').where(filter=firestore.FieldFilter('followee', '==', uid)).stream()
            profile['followersCount'] = sum(1 for _ in followers)
        except Exception:
            profile['followersCount'] = 0
            
        try:
            following = db.collection('follows').where(filter=firestore.FieldFilter('follower', '==', uid)).stream()
            profile['followingCount'] = sum(1 for _ in following)
        except Exception:
            profile['followingCount'] = 0
        
        return jsonify({"profile": profile}), 200

    except auth.InvalidIdTokenError as e:
        return jsonify({"error": "Invalid or expired token", "details": str(e)}), 401
    except Exception as e:
        # Log the error for debugging but don't expose internal details
        print(f"Verify token error: {str(e)}")
        return jsonify({"error": "Token verification failed"}), 401


@auth_bp.route('/profile', methods=['GET', 'PUT'])
def profile():
    try:
        # Allow either an ID token (production) or a demo UID supplied for local/dev testing.
        id_token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            id_token = auth_header.split('Bearer ')[1]

        uid = None
        # If token present, verify it
        if id_token:
            decoded = auth.verify_id_token(id_token)
            uid = decoded.get('uid')
        else:
            # Accept UID from query param, JSON body, or X-Demo-Uid header for dev/demo convenience
            uid = request.args.get('uid') or (request.json.get('uid') if request.json else None) or request.headers.get('X-Demo-Uid')

        if not uid:
            return jsonify({"error": "Missing ID token or uid (use demo uid via X-Demo-Uid or uid param)"}), 400

        db = get_db()
        user_ref = db.collection('users').document(uid)

        if request.method == 'GET':
            doc = user_ref.get()
            if not doc.exists:
                return jsonify({"error": "Profile not found"}), 404
            profile = doc.to_dict()
            profile['uid'] = uid
            
            # Fetch stats
            try:
                # Firestore count query
                posts_count = db.collection('posts').where('author_uid', '==', uid).count().get()
                # count().get() returns an aggregation query snapshot, need to access [0][0].value usually or .count
                # Actually in python admin sdk checks:
                # result[0][0].value if using aggregation, but let's check exact syntax or use len(stream) for safety if count() not available in this env
                # Safer fallback for this environment:
                posts_query = db.collection('posts').where(filter=firestore.FieldFilter('author_uid', '==', uid)).stream()
                profile['postsCount'] = sum(1 for _ in posts_query)
            except Exception:
                profile['postsCount'] = 0

            return jsonify({"profile": profile}), 200

        # PUT: update profile fields
        data = request.json or {}
        allowed = {'name', 'skills', 'github_link', 'avatar_url', 'resume_url', 'bio'}
        update_data = {k: v for k, v in data.items() if k in allowed}
        if 'skills' in update_data and isinstance(update_data['skills'], list):
            # ok
            pass
        elif 'skills' in update_data and isinstance(update_data['skills'], str):
            # accept comma-separated string
            update_data['skills'] = [s.strip() for s in update_data['skills'].split(',') if s.strip()]

        if update_data:
            # create document if it doesn't exist
            doc = user_ref.get()
            if doc.exists:
                user_ref.update(update_data)
            else:
                # provide sane defaults
                base = {
                    'name': update_data.get('name', ''),
                    'email': '',
                    'skills': update_data.get('skills', []) if isinstance(update_data.get('skills', []), list) else [],
                    'github_link': update_data.get('github_link', ''),
                    'avatar_url': update_data.get('avatar_url', ''),
                    'resume_url': update_data.get('resume_url', ''),
                    'bio': update_data.get('bio', '')
                }
                # merge any provided fields
                base.update(update_data)
                user_ref.set(base)
            return jsonify({"message": "Profile updated"}), 200
        else:
            return jsonify({"message": "No valid fields to update"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@auth_bp.route('/profile/upload_resume', methods=['POST'])
def upload_resume():
    try:
        # Accept multipart form with 'file' and idToken in header or form
        # Accept multipart form with 'file' and idToken in header or form
        id_token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            id_token = auth_header.split('Bearer ')[1]
        else:
            id_token = request.form.get('idToken')

        uid = None
        if id_token:
            decoded = auth.verify_id_token(id_token)
            uid = decoded.get('uid')
        else:
            # allow demo uid via form or header
            uid = request.form.get('uid') or request.headers.get('X-Demo-Uid')

        if not uid:
            return jsonify({"error": "Missing ID token or uid"}), 400

        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        f = request.files['file']
        filename = f.filename or 'resume.pdf'

        # Upload to Firebase Storage
        from firebase_admin import storage
        bucket = storage.bucket()
        blob_path = f'profiles/resumes/{uid}/{filename}'
        blob = bucket.blob(blob_path)
        blob.upload_from_string(f.read(), content_type=f.content_type)
        # Make public (optional) and store URL
        try:
            blob.make_public()
            public_url = blob.public_url
        except Exception:
            # Fallback: generate signed URL (requires proper permissions)
            public_url = blob.path

        # Save resume URL to profile; create document if missing using merge
        db = get_db()
        user_ref = db.collection('users').document(uid)
        try:
            # Use set with merge to avoid failing when document does not exist
            user_ref.set({'resume_url': public_url}, merge=True)
        except Exception:
            # Fallback to update (older SDKs) but ignore not-found errors
            try:
                user_ref.update({'resume_url': public_url})
            except Exception:
                pass

        return jsonify({"message": "Resume uploaded", "resume_url": public_url}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@auth_bp.route('/profile/upload_avatar', methods=['POST'])
def upload_avatar():
    try:
        # Accept multipart form with 'file' and idToken in header or form
        # Accept multipart form with 'file' and idToken in header or form
        id_token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            id_token = auth_header.split('Bearer ')[1]
        else:
            id_token = request.form.get('idToken')

        uid = None
        if id_token:
            decoded = auth.verify_id_token(id_token)
            uid = decoded.get('uid')
        else:
            # allow demo uid via form or header
            uid = request.form.get('uid') or request.headers.get('X-Demo-Uid')

        if not uid:
            return jsonify({"error": "Missing ID token or uid"}), 400

        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        f = request.files['file']
        filename = f.filename or 'avatar.png'

        from firebase_admin import storage
        bucket = storage.bucket()
        blob_path = f'profiles/avatars/{uid}/{filename}'
        blob = bucket.blob(blob_path)
        blob.upload_from_string(f.read(), content_type=f.content_type)
        try:
            blob.make_public()
            public_url = blob.public_url
        except Exception:
            public_url = blob.path

        # Save avatar URL to profile; create document if missing using merge
        db = get_db()
        user_ref = db.collection('users').document(uid)
        try:
            user_ref.set({'avatar_url': public_url}, merge=True)
        except Exception:
            try:
                user_ref.update({'avatar_url': public_url})
            except Exception:
                pass

        return jsonify({"message": "Avatar uploaded", "avatar_url": public_url}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400