import sys
import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore, auth

# Setup Logging
logging.basicConfig(
    filename='fix_login.log', 
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filemode='w'
)

def log(msg):
    print(msg)
    logging.info(msg)

# Initialize Firebase
if not firebase_admin._apps:
    try:
        key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'serviceAccountKey.json')
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        log(f"Init Error: {e}")
        sys.exit(1)

db = firestore.client()

def fix_login():
    log("🚀 Starting Login Repair...")
    
    # 1. Get all Firestore users
    users_ref = db.collection('users')
    docs = users_ref.stream()
    firestore_users = []
    for doc in docs:
        d = doc.to_dict()
        d['uid'] = doc.id
        firestore_users.append(d)
    
    log(f"Found {len(firestore_users)} users in Firestore.")

    # 2. Check and Create in Auth
    created = 0
    existing = 0
    errors = 0
    
    for u in firestore_users:
        email = u.get('email')
        uid = u['uid']
        name = u.get('name', 'Unknown')
        
        if not email:
            log(f"Skipping user {uid} - No email")
            continue

        try:
            # Try to get user
            try:
                auth.get_user(uid)
                existing += 1
            except auth.UserNotFoundError:
                # Create user
                auth.create_user(
                    uid=uid,
                    email=email,
                    password='password123',
                    display_name=name,
                    photo_url=u.get('avatar_url')
                )
                created += 1
                if created % 20 == 0: log(f"Created {created} missing auth accounts...")
                
        except Exception as e:
            # If email already exists but with different UID, this is tricky. 
            # But our seed script generated unique emails.
            log(f"Error for {email}: {e}")
            errors += 1

    log("✅ Fix Complete.")
    log(f"Authorized Users: {existing}")
    log(f"Newly Created Users: {created}")
    log(f"Failed: {errors}")

if __name__ == '__main__':
    fix_login()
