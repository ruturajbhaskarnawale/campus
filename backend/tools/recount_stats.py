import sys
import os
sys.path.append(os.getcwd())

from lib.db.database import db_session, engine
from lib.db.models import User, Post, Follow, PostLike, Comment

def recount_all():
    session = db_session
    print("Starting data consistency check...")

    try:
        # 1. Users: Followers & Following
        users = session.query(User).all()
        print(f"Checking {len(users)} users...")
        
        for u in users:
            followers = session.query(Follow).filter(Follow.followed_id == u.id).count()
            following = session.query(Follow).filter(Follow.follower_id == u.id).count()
            
            u.followers_count = followers
            u.following_count = following
            
            # Recalculate Project/Post counts for XP (optional but good)
            # (We leave XP logic alone for now to avoid altering gamification too much, just stats)
            
        print("User stats updated.")

        # 2. Posts: Likes & Comments
        posts = session.query(Post).all()
        print(f"Checking {len(posts)} posts...")
        
        for p in posts:
            likes = session.query(PostLike).filter(PostLike.post_id == p.id).count()
            comments = session.query(Comment).filter(Comment.post_id == p.id).count()
            
            p.likes_count = likes
            p.comments_count = comments
            
        print("Post stats updated.")
        
        session.commit()
        print("Data consistency check complete. All counts synchronized.")
        
    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    recount_all()
