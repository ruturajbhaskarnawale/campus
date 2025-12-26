import sys
import os
import datetime
sys.path.append(os.getcwd())

from lib.db.database import db_session
from lib.db.models import User, Post, Comment, Follow, Notification
import bcrypt
import uuid

def debug_all():
    session = db_session
    print("=== START DEBUG ===")
    
    try:
        # 1. Test User Creation / Login
        print("\n[1] Testing Auth...")
        test_email = f"test_{uuid.uuid4().hex[:8]}@student.edu"
        password = "password123"
        
        # Register
        existing = session.query(User).filter(User.email == test_email).first()
        if existing:
            print("User exists, cleaning up...")
            session.delete(existing)
            session.commit()
            
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user = User(
            uid=str(uuid.uuid4()),
            username=f"user_{uuid.uuid4().hex[:6]}",
            email=test_email,
            full_name="Debug User",
            password_hash=hashed,
            followers_count=0,
            following_count=0
        )
        session.add(user)
        session.commit()
        print(f"User created: {user.id} / {user.email}")
        
        # Verify Login Logic
        print("Verifying password check...")
        if bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            print("Login logic OK: Password matches.")
        else:
            print("Login logic FAILED: Password mismatch!")
        
        # Verify columns exist
        print(f"Followers: {user.followers_count}, Following: {user.following_count}")

        # 2. Test Follow
        print("\n[2] Testing Follow...")
        target_user = session.query(User).filter(User.id != user.id).first()
        if not target_user:
            print("No other user to follow.")
        else:
            print(f"Trying to follow user {target_user.id}...")
            
            # Logic from routes.py
            new_follow = Follow(follower_id=user.id, followed_id=target_user.id)
            session.add(new_follow)
            
            # Count Update
            user.following_count = (user.following_count or 0) + 1
            target_user.followers_count = (target_user.followers_count or 0) + 1
            
            session.commit()
            print("Follow success. Commited.")

        # 3. Test Comment
        print("\n[3] Testing Comment...")
        post = session.query(Post).first()
        if not post:
            print("No post to comment on.")
        else:
            print(f"Commenting on post {post.id}...")
            
            new_comment = Comment(
                post_id=post.id,
                user_id=user.id,
                content="Debug comment content",
                created_at=datetime.datetime.utcnow()
            )
            session.add(new_comment)
            
            # Count Update
            post.comments_count = (post.comments_count or 0) + 1
            
            # Notification check
            if post.author_id != user.id:
                print("Adding notification...")
                n = Notification(
                    recipient_id=post.author_id,
                    type='comment',
                    title='Debug Notif',
                    body='Debug body',
                    reference_id=post.id,
                    reference_type='post',
                    created_at=datetime.datetime.utcnow()
                )
                session.add(n)
            
            session.commit()
            print(f"Comment success. ID: {new_comment.id}")
            
        print("\n=== DEBUG COMPLETE: SUCCESS ===")

    except Exception as e:
        print(f"\n!!! CRITICAL FAILURE !!!")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    debug_all()
