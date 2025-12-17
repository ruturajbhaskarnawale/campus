import sys
import os
import logging
import firebase_admin
from firebase_admin import credentials, auth

# Setup Logging
logging.basicConfig(level=logging.INFO)

def reset_password(email, new_password):
    print(f"Resetting password for {email}...")
    
    # Initialize
    if not firebase_admin._apps:
        try:
            key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'serviceAccountKey.json')
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
        except Exception as e:
            print(f"Init Error: {e}")
            return

    try:
        user = auth.get_user_by_email(email)
        print(f"User found: {user.uid}")
        
        auth.update_user(
            user.uid,
            password=new_password
        )
        print(f"Password successfully updated to: {new_password}")
        
    except auth.UserNotFoundError:
        print(f"User {email} not found in Auth.")
        # Optional: Verify if in Firestore?
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python reset_password.py <email>")
    else:
        reset_password(sys.argv[1], 'password123')
