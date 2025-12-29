import sys
import os
import bcrypt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from lib.db.models import User
from lib.db.database import db_session

def check_login():
    print("Verifying login for seeded users...")
    session = db_session
    
    users = session.query(User).all()
    password = "password123"
    
    for user in users:
        print(f"Checking user: {user.username} ({user.email})")
        if not user.password_hash:
            print(f"FAILED: No password hash for {user.username}")
            continue
            
        stored_pw = user.password_hash.encode('utf-8')
        if bcrypt.checkpw(password.encode('utf-8'), stored_pw):
            print(f"SUCCESS: Login valid for {user.username}")
        else:
            print(f"FAILED: Password mismatch for {user.username}")

if __name__ == "__main__":
    check_login()
