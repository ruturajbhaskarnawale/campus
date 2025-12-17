import logging
import sys
import os

# Setup logging to file
logging.basicConfig(filename='verify.log', level=logging.INFO, filemode='w')

def print(msg):
    logging.info(msg)
    # also write to stdout
    sys.stdout.write(msg + '\n')

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth
except ImportError:
    print("ImportError: checking venv...")

if not firebase_admin._apps:
    try:
        key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'serviceAccountKey.json')
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Using default credentials. Error: {e}")
        firebase_admin.initialize_app()

db = firestore.client()

def verify():
    print("🔍 verifying Database State...")
    
    # Check Firestore Users
    users_ref = db.collection('users')
    users_stream = list(users_ref.stream())
    print(f"Firestore Users Total: {len(users_stream)}")

    # Check Firestore Posts
    posts_ref = db.collection('posts')
    posts_stream = list(posts_ref.stream())
    print(f"Firestore Posts Total: {len(posts_stream)}")

    # Check Auth Users
    try:
        print("Listing Auth Users...")
        page = auth.list_users(max_results=50) # Get a chunk
        print(f"Auth Users (First Page): {len(page.users)}")
        for u in page.users[:10]:
            print(f" - {u.email}")
    except Exception as e:
        print(f"Failed to list Auth users: {str(e)}")

verify()

def check_specific_user(email):
    print(f"\n🔍 Checking for specific user: {email}...")
    try:
        user = auth.get_user_by_email(email)
        print(f"✅ User FOUND in Auth:")
        print(f" - UID: {user.uid}")
        print(f" - Disabled: {user.disabled}")
        print(f" - Email Verified: {user.email_verified}")
        
        # Check Firestore
        doc = db.collection('users').document(user.uid).get()
        if doc.exists:
            print(f"✅ User FOUND in Firestore users collection.")
        else:
            print(f"❌ User NOT FOUND in Firestore users collection.")
            
    except auth.UserNotFoundError:
        print(f"❌ User {email} NOT FOUND in Firebase Auth.")
    except Exception as e:
        print(f"⚠️ Error checking user: {e}")

check_specific_user('aditi.deshmukh165@university.edu')
