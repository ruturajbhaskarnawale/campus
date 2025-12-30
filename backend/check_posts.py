
import sqlite3
import json

DB_PATH = 'backend/campus.db'

def check_posts():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 1. Get User
    c.execute("SELECT id, uid, full_name FROM users LIMIT 10")
    users = c.fetchall()
    print(f"Found {len(users)} users.", flush=True)
    
    for u in users:
        print(f"\nUser: {u['full_name']} (ID: {u['id']}, UID: {u['uid']})")
        
        # 2. Get Posts
        c.execute("SELECT id, title, media_urls_json FROM posts WHERE author_id = ?", (u['id'],))
        posts = c.fetchall()
        print(f"  > Found {len(posts)} posts.")
        for p in posts:
            media = p['media_urls_json']
            print(f"    - Post {p['id']}: {p['title']}")
            print(f"      Media: {media} (Type: {type(media)})")

    conn.close()

if __name__ == "__main__":
    check_posts()
