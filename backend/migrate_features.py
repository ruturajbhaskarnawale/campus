import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'campus.db')

def migrate():
    print(f"Migrating database at {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print("Database not found, skipping migration (init_db will handle it)")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Add reaction_type to post_likes
    try:
        cursor.execute("ALTER TABLE post_likes ADD COLUMN reaction_type VARCHAR(20) DEFAULT 'like'")
        print("Added reaction_type to post_likes")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e):
            print("reaction_type already exists in post_likes")
        else:
            print(f"Error adding reaction_type: {e}")

    # 2. Add poll_data_json to posts
    try:
        cursor.execute("ALTER TABLE posts ADD COLUMN poll_data_json JSON")
        print("Added poll_data_json to posts")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e):
            print("poll_data_json already exists in posts")
        else:
            print(f"Error adding poll_data_json: {e}")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
