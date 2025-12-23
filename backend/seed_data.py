
import sys
import os
from datetime import datetime, timedelta
import bcrypt
import json
import random

# Add backend directory to python path
sys.path.append(os.getcwd())

from lib.db.database import init_db, db_session
from lib.db.models import User, Post, Project, Comment, PostLike, Notification

def seed_data():
    session = db_session
    print(">> Seeding Data...")

    # 1. Users
    users = [
        {
            "uid": "uid_test_user",
            "email": "test@university.edu",
            "password": "password123", # Simple password
            "name": "Test User",
            "role": "Student",
            "avatar": "https://ui-avatars.com/api/?name=Test+User&background=0D8ABC&color=fff" 
        },
        {
            "uid": "uid_jane_doe",
            "email": "jane@university.edu",
            "name": "Jane Doe",
            "role": "Student",
            "avatar": "https://i.pravatar.cc/150?u=jane"
        },
        {
            "uid": "uid_john_smith",
            "email": "john@university.edu",
            "name": "John Smith",
            "role": "Alumini",
            "avatar": "https://i.pravatar.cc/150?u=john"
        }
    ]

    db_users = {}
    
    for u in users:
        existing = session.query(User).filter_by(email=u['email']).first()
        if existing:
            # Update password just in case
            hashed = bcrypt.hashpw(u.get('password', 'password123').encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            existing.password_hash = hashed
            db_users[u['email']] = existing
            print(f"Updated user: {u['email']}")
        else:
            # Generate unique username
            base_username = u['email'].split('@')[0]
            username = base_username
            counter = 1
            while session.query(User).filter_by(username=username).first():
                username = f"{base_username}{counter}"
                counter += 1

            hashed = bcrypt.hashpw(u.get('password', 'password123').encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            new_user = User(
                uid=u['uid'],
                email=u['email'],
                username=username,
                full_name=u['name'],
                password_hash=hashed,
                role=u['role'],
                avatar_url=u['avatar'],
                xp_points=random.randint(50, 500)
            )
            session.add(new_user)
            db_users[u['email']] = new_user
            print(f"Created user: {u['email']} (username: {username})")
    
    session.commit()
    
    main_user = db_users["test@university.edu"]
    jane = db_users["jane@university.edu"]
    john = db_users["john@university.edu"]

    # 2. Posts & Polls
    # Clean up existing posts to avoid duplicates if re-running partially? 
    # For now, let's just append.
    
    # Post 1: Poll
    poll_post = Post(
        author_id=jane.id,
        title="Best Programming Language for 2025?",
        content_body="I'm starting a new project and can't decide. Vote below!",
        type="post",
        created_at=datetime.utcnow(),
        poll_data_json={
            "question": "Which language should I use?",
            "options": [
                {"id": 0, "text": "Python", "votes": 5},
                {"id": 1, "text": "Rust", "votes": 12},
                {"id": 2, "text": "Go", "votes": 8},
                {"id": 3, "text": "TypeScript", "votes": 15}
            ],
            "voters": []
        },
        likes_count=45,
        comments_count=2,
        views_count=120
    )
    session.add(poll_post)
    
    # Post 2: Project with Media
    project_post = Post(
        author_id=john.id,
        title="Campus AI Assistant",
        content_body="Building an AI to help students navigate campus. Looking for ML engineers and Frontend devs. \n\n```python\nimport tensorflow as tf\nmodel = tf.keras.models.Sequential()\n```",
        type="project",
        media_urls_json=[
            "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1550439062-609e15333758?auto=format&fit=crop&w=800&q=80"
        ],
        tags_json=["AI", "Python", "React Native"],
        created_at=datetime.utcnow() - timedelta(hours=2),
        likes_count=12,
        comments_count=0
    )
    # create associated project
    project_details = Project(
        owner_id=john.id,
        status="recruiting",
        skills_required_json=["Python", "TensorFlow", "React"]
    )
    project_post.project = project_details
    session.add(project_post)

    # Post 3: Simple Status
    status_post = Post(
        author_id=main_user.id,
        title="Just launched my portfolio!",
        content_body="Check it out at https://ruturaj.dev. Feedback welcome! #webdev #portfolio",
        type="post",
        created_at=datetime.utcnow() - timedelta(days=1),
        likes_count=5,
        comments_count=1
    )
    session.add(status_post)
    
    session.commit()

    # 3. Interconnectivity (Likes, Comments)
    
    # Jane likes John's project with 'celebrate'
    like1 = PostLike(user_id=jane.id, post_id=project_post.id, reaction_type="celebrate")
    session.add(like1)
    
    # Test User likes Jane's poll
    like2 = PostLike(user_id=main_user.id, post_id=poll_post.id, reaction_type="like")
    session.add(like2)
    
    # Nested Comments: John replies to Jane's Poll
    c1 = Comment(
        post_id=poll_post.id,
        author_id=john.id,
        content="Definitely Rust for performance!",
        created_at=datetime.utcnow() - timedelta(minutes=30)
    )
    session.add(c1)
    session.commit()
    
    # Test User replies to John
    c2 = Comment(
        post_id=poll_post.id,
        author_id=main_user.id,
        content="But the ecosystem is smaller?",
        parent_id=c1.id, # Nested
        created_at=datetime.utcnow() - timedelta(minutes=10)
    )
    session.add(c2)
    session.commit()
    
    print(">> Data Seeded Successfully!")
    print(f">> Login with: test@university.edu / password123")

if __name__ == '__main__':
    seed_data()
