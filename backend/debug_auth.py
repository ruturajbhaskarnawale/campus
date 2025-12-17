import sys
import os
import logging
import datetime

# Setup Logging
logging.basicConfig(
    filename='auth_debug.log', 
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filemode='w'
)

def log(msg):
    print(msg)
    logging.info(msg)

log("Auth Debug started...")

try:
    import firebase_admin
    from firebase_admin import credentials, auth
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'serviceAccountKey.json')
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)
    log("Firebase initialized.")
    
    # 1. List Users
    log("Listing users...")
    page = auth.list_users(max_results=5)
    log(f"Found {len(page.users)} users.")
    for u in page.users:
        log(f" - {u.email} ({u.uid})")
        
    # 2. Create User
    log("Creating test user...")
    try:
        u = auth.create_user(
            email=f"test_auth_{datetime.datetime.now().timestamp()}@test.com",
            password="password123"
        )
        log(f"Created user: {u.uid}")
        
        # 3. Delete It
        auth.delete_user(u.uid)
        log("Deleted user.")
    except Exception as e:
        log(f"Error creating/deleting user: {e}")

except Exception as e:
    log(f"CRITICAL ERROR: {e}")
