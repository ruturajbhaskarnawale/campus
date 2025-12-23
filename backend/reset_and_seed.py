import os
import sys
import time

# Add backend directory to sys.path to allow imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from lib.db.database import init_db, db_session, engine
from lib.db.models import User, Post, Project
import datetime
import uuid
import bcrypt

def reset_db():
    print("Resetting database...")
    db_path = os.path.join(current_dir, 'campus.db')
    
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print(f"Removed {db_path}")
        except PermissionError:
            print(f"ERROR: Could not delete {db_path}.")
            print("The database file is locked. Please STOP the running backend server (Ctrl+C) and try again.")
            sys.exit(1)
        except Exception as e:
            print(f"Error removing DB: {e}")
            sys.exit(1)
    
    print("Creating tables...")
    try:
        init_db()
        print("Tables created.")
    except Exception as e:
        print(f"Error creating tables: {e}")
        sys.exit(1)

def seed_data():
    session = db_session
    
    print("Seeding data...")
    # Check if user exists (in case we didn't delete DB)
    email = "ruturaj@university.edu"
    existing = session.query(User).filter(User.email == email).first()
    if existing:
        print(f"User {email} already exists.")
        user = existing
    else:
        # Create User
        password = "password123"
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        user = User(
            uid=str(uuid.uuid4()),
            email=email,
            password_hash=hashed,
            full_name="Ruturaj",
            role="Student",
            university="University",
            avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Ruturaj",
            created_at=datetime.datetime.utcnow()
        )
        session.add(user)
        session.flush() # get user.id
        print(f"Seeded User: {email}")
    
    # Create Post
    if session.query(Post).count() == 0:
        post = Post(
            author_id=user.id,
            title="Welcome to Campus Hub",
            content_body="This is the first post on the new platform!",
            type="post",
            created_at=datetime.datetime.utcnow(),
            likes_count=0,
            comments_count=0
        )
        session.add(post)
        print("Seeded Welcome Post")
    else:
        print("Posts already exist.")
    
    session.commit()

if __name__ == "__main__":
    reset_db()
    seed_data()

