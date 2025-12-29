
import sys
import os

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.db.database import init_db, db_session
from lib.db.models import User, Post, SavedPost

def verify_data():
    try:
        print("Initializing DB...")
        # init_db() # Assuming DB is already initialized, just need session
        
        session = db_session
        uid = "uid_arjun"
        
        print(f"Querying User with uid={uid}...")
        user = session.query(User).filter(User.uid == uid).first()
        
        if not user:
            print(f"User {uid} NOT FOUND!")
            return
            
        print(f"User Found: ID={user.id}")
        print("Accessing attributes for get_profile:")
        print(f" - uid: {user.uid}")
        print(f" - full_name: {user.full_name}")
        print(f" - username: {user.username}")
        print(f" - avatar_url: {user.avatar_url}")
        print(f" - bio: {user.bio}")
        print(f" - role: {user.role}")
        print(f" - followers_count: {user.followers_count}")
        print(f" - following_count: {user.following_count}")
        print(f" - xp_points: {user.xp_points}") 
        print("Attributes access SUCCESS.")
        
        print("-" * 20)
        print("Testing Feed Query with author_uid...")
        posts = session.query(Post).filter(Post.author_id == user.id).limit(5).all()
        print(f"Found {len(posts)} posts for user.")
        for p in posts:
             print(f"Post {p.id}: author_uid={p.author.uid if p.author else 'None'}")
             
        print("-" * 20)
        print("Testing Bookmarks Query...")
        saved = session.query(SavedPost).filter(SavedPost.user_id == user.id).all()
        print(f"Found {len(saved)} bookmarks.")
        for s in saved:
            print(f"SavedPost {s.id}: post_id={s.post_id}")
            p = s.post
            if p:
                print(f"  -> Linked Post: {p.title}")
            else:
                 print(f"  -> Linked Post IS NONE (Orphaned?)")
                 # Check if manual query works
                 p_manual = session.query(Post).filter(Post.id == s.post_id).first()
                 print(f"  -> Manual Fetch: {'Found' if p_manual else 'Not Found'}")

    except Exception as e:
        print(f"CRITICAL EXCEPTION: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_data()
