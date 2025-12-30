
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

from flask import Flask
from lib.db.database import init_db, db_session
from lib.features.auth.routes import auth_bp
from lib.db.models import User
import traceback

app = Flask(__name__)
app.register_blueprint(auth_bp, url_prefix='/api/auth')

def debug_auth():
    print("--- Starting Debug Session ---")
    
    # 1. Test Database Connection & Schema
    try:
        init_db()
        print("Database initialized.")
    except Exception as e:
        print("CRITICAL: Database init failed.")
        traceback.print_exc()
        return

    # 2. Test Login (Replicate User Error)
    print("\n--- Testing Login ---")
    with app.test_client() as client:
        try:
            # Try a known user
            # First check if user exists
            u = db_session.query(User).first()
            if u:
                email = u.email
                print(f"Attempting login for existing user: {email}")
                # Note: Password check might fail if hash logic is complex, 
                # but we want to see if it Crashes (500) or fails gracefully (401).
                resp = client.post('/api/auth/login', json={
                    'email': email,
                    'password': 'password123', # Assuming seed password
                    'isUniLogin': False
                })
                print(f"Login Status: {resp.status_code}")
                if resp.status_code == 500:
                    print("Login 500 Response Data:", resp.data)
            else:
                print("No users in DB to test login.")
        except Exception as e:
            print("Login Exception:")
            traceback.print_exc()

    # 3. Test Register (Replicate 400 Error)
    print("\n--- Testing Register ---")
    with app.test_client() as client:
        try:
            resp = client.post('/api/auth/register', json={
                'email': 'debug_new@test.com',
                'password': 'password123',
                'fullName': 'Debug User',
                'username': 'debug_user',
                'role': 'Student',
                'university': 'Debug Univ'
            })
            print(f"Register Status: {resp.status_code}")
            print(f"Register Response: {resp.json}")
        except Exception as e:
             print("Register Exception:")
             traceback.print_exc()

if __name__ == "__main__":
    debug_auth()
