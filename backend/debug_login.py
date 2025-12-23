from lib.db.database import init_db, db_session
from lib.db.models import User
import bcrypt

init_db()
session = db_session

email = "ruturaj@university.edu"
user = session.query(User).filter(User.email == email).first()

if user:
    print(f"User found: {user.username} (ID: {user.id})")
    print(f"Password Hash: {user.password_hash}")
    
    if user.password_hash:
        # Try checking 'password123'
        try:
            stored = user.password_hash.encode('utf-8')
            if bcrypt.checkpw(b'password123', stored):
                print("SUCCESS: Password 'password123' matches hash.")
            else:
                print("FAILURE: Password 'password123' does NOT match hash.")
        except Exception as e:
            print(f"Error checking hash: {e}")
    else:
        print("No password hash found.")
else:
    print(f"User with email {email} NOT FOUND.")
    
    # List all users
    print("\nListing all users:")
    users = session.query(User).all()
    for u in users:
        print(f"- {u.email} (Hash: {u.password_hash is not None})")
