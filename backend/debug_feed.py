import sys
import os
import requests
import firebase_admin
from firebase_admin import credentials, firestore

# Add local path to sys to import lib
sys.path.append(os.getcwd())

try:
    from lib.core.utils.firebase_config import get_db
except Exception as e:
    print(f"Could not import get_db: {e}")
    # Try to initialize manually if app not running
    pass

def check_api():
    url = "http://localhost:5000/api/feed"
    print(f"Checking API: {url}")
    try:
        resp = requests.get(url, timeout=5)
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text[:500]}...") # Print first 500 chars
    except Exception as e:
        print(f"API Request failed: {e}")

def check_db():
    print("Checking Database Direct Access...")
    try:
        if not firebase_admin._apps:
             # We assume default app might be initialized by lib import if it runs init
             # If not, we rely on environment or existing creds
             # This part might be tricky if firebase_config implementation relies on Flask context
             pass
        
        db = get_db()
        posts_ref = db.collection('posts')
        count = 0
        for _ in posts_ref.stream():
            count += 1
        print(f"Total posts in 'posts' collection: {count}")
    except Exception as e:
        print(f"DB Check failed: {e}")

if __name__ == "__main__":
    check_api()
    # check_db() # Skipping direct DB check to avoid interference with running app if possible, or context issues.
    # Actually, let's try API first.
