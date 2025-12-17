import firebase_admin
from firebase_admin import credentials, firestore
import os

# Global variable to hold the DB connection
db = None

def initialize_firebase():
    global db
    
    # Path to your downloaded key
    # WE USE 'backend' because app.py runs from the backend folder
    cred_path = "serviceAccountKey.json" 
    if not os.path.exists(cred_path):
        # Fail fast: raising helps the developer notice missing credentials during startup
        raise FileNotFoundError(f"serviceAccountKey.json not found at {cred_path}. Place your Firebase admin key in the backend folder or set GOOGLE_APPLICATION_CREDENTIALS.")

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