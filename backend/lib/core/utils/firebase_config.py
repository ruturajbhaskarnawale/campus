import firebase_admin
from firebase_admin import credentials, firestore
import os

# Global variable to hold the DB connection
db = None

def initialize_firebase():
    global db
    
    # Path to your downloaded key
    # Resolve absolute path relative to this file to ensure it works from any CWD
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Go up 3 levels: utils(0) -> core(1) -> lib(2) -> backend(3)
    # current_dir is .../backend/lib/core/utils
    backend_dir = os.path.abspath(os.path.join(current_dir, '..', '..', '..'))
    cred_path = os.path.join(backend_dir, "serviceAccountKey.json")
    
    if not os.path.exists(cred_path):
        # Fallback: check current directory
        if os.path.exists("serviceAccountKey.json"):
            cred_path = "serviceAccountKey.json"
        else:
            # Fail fast
            raise FileNotFoundError(f"serviceAccountKey.json not found at {cred_path}. Place your Firebase admin key in the backend folder.")

    # Check if app is already initialized to prevent errors during auto-reload
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            bucket = os.environ.get('FIREBASE_STORAGE_BUCKET')
            if bucket:
                firebase_admin.initialize_app(cred, { 'storageBucket': bucket })
            else:
                firebase_admin.initialize_app(cred)
            print("Firebase initialized successfully!")
    except Exception as e:
        # Re-raise with more context
        raise RuntimeError(f"Failed to initialize Firebase Admin SDK: {e}")

    try:
        db = firestore.client()
    except Exception as e:
        raise RuntimeError(f"Failed to get Firestore client: {e}")

    return db

def get_db():
    return db