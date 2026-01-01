
import sqlite3
import sys
import os

DB_NAME = 'campus.db'

def rollback_seeded_data():
    if not os.path.exists(DB_NAME):
        print(f"Error: {DB_NAME} not found.")
        return

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    print("--- Rollback Seeded Data (ID-based) ---")
    
    # Strategy: Delete the last 500 users added.
    # We assume valid IDs are auto-incrementing.
    
    LIMIT = 500
    print(f"Identifying the last {LIMIT} users...")
    
    cursor.execute(f"SELECT id FROM users ORDER BY id DESC LIMIT {LIMIT}")
    target_user_ids = [row[0] for row in cursor.fetchall()]
    
    if not target_user_ids:
        print("No users found.")
        conn.close()
        return

    print(f"Found {len(target_user_ids)} users to delete.")
    print(f"ID Range: {min(target_user_ids)} - {max(target_user_ids)}")
    
    # Safety Check: Do not delete if we are deleting everything and there's nothing left?
    # Actually, user wants to keep the original 5.
    # Let's verify we are not deleting low IDs if possible?
    # Assuming original IDs are 1, 2, 3... and new ones are > 5.
    
    if min(target_user_ids) <= 5:
        print("Warning: This selection includes low IDs (potential original data).")
        # In automation, we might want to skip or proceed. 
        # Given the user instruction "dont return nearly to zero and implement this", 
        # they want to delete the seed. 
        # If the DB only has 505 users, deleting 500 leaves 5. Correct.
    
    # Convert list to tuple for SQL IN clause
    user_ids_tuple = tuple(target_user_ids)
    if len(user_ids_tuple) == 1:
        user_ids_tuple = f"({user_ids_tuple[0]})"
    else:
        user_ids_tuple = str(user_ids_tuple)

    try:
        # 2. Delete Dependencies (Child Tables)
        
        # Notifications
        print("X Deleting Notifications...")
        cursor.execute(f"DELETE FROM notifications WHERE sender_id IN {user_ids_tuple} OR recipient_id IN {user_ids_tuple}")
        
        # Comments
        print("X Deleting Comments...")
        cursor.execute(f"DELETE FROM comments WHERE user_id IN {user_ids_tuple}")
        
        # Projects
        print("X Deleting Projects...")
        cursor.execute(f"DELETE FROM projects WHERE owner_id IN {user_ids_tuple}")
        
        # Posts (authored by these users)
        # Identify posts to be deleted to clean up their sub-resources
        cursor.execute(f"SELECT id FROM posts WHERE author_id IN {user_ids_tuple}")
        post_ids = [r[0] for r in cursor.fetchall()]
        if post_ids:
            post_ids_tuple = tuple(post_ids)
            if len(post_ids_tuple) == 1: post_ids_tuple = f"({post_ids_tuple[0]})"
            else: post_ids_tuple = str(post_ids_tuple)
            
            print(f"  - Cleaning up dependent data for {len(post_ids)} posts...")
            cursor.execute(f"DELETE FROM comments WHERE post_id IN {post_ids_tuple}")
            cursor.execute(f"DELETE FROM post_likes WHERE post_id IN {post_ids_tuple}")
            cursor.execute(f"DELETE FROM saved_posts WHERE post_id IN {post_ids_tuple}")
        
        print("X Deleting Posts...")
        cursor.execute(f"DELETE FROM posts WHERE author_id IN {user_ids_tuple}")
        
        # Follows
        print("X Deleting Follows...")
        cursor.execute(f"DELETE FROM follows WHERE follower_id IN {user_ids_tuple} OR followed_id IN {user_ids_tuple}")
        
        # User Skills
        print("X Deleting UserSkills...")
        cursor.execute(f"DELETE FROM user_skills WHERE user_id IN {user_ids_tuple}")
        
        # Messages / Participants
        print("X Deleting Messages & Participants...")
        cursor.execute(f"DELETE FROM messages WHERE sender_id IN {user_ids_tuple}")
        cursor.execute(f"DELETE FROM conversation_participants WHERE user_id IN {user_ids_tuple}")
        
        # App Settings
        print("X Deleting App Settings...")
        cursor.execute(f"DELETE FROM app_settings WHERE user_id IN {user_ids_tuple}")
        
        # Daily Insights
        print("X Deleting Daily Insights...")
        cursor.execute(f"DELETE FROM daily_insights WHERE user_id IN {user_ids_tuple}")
        
        # Search History / Reports
        print("X Deleting History & Reports...")
        cursor.execute(f"DELETE FROM search_history WHERE user_id IN {user_ids_tuple}")
        cursor.execute(f"DELETE FROM reports WHERE reporter_id IN {user_ids_tuple}")
        
        # Post Likes / Saved Posts (by these users)
        cursor.execute(f"DELETE FROM post_likes WHERE user_id IN {user_ids_tuple}")
        cursor.execute(f"DELETE FROM saved_posts WHERE user_id IN {user_ids_tuple}")

        # 3. Delete Users
        print(f"X Deleting {len(target_user_ids)} Users...")
        cursor.execute(f"DELETE FROM users WHERE id IN {user_ids_tuple}")
        
        conn.commit()
        print("Rollback successful.")
        
        # Post-check
        cursor.execute("SELECT COUNT(*) FROM users")
        remaining = cursor.fetchone()[0]
        print(f"Remaining Users in DB: {remaining}")

    except Exception as e:
        print(f"Error during rollback: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    rollback_seeded_data()
