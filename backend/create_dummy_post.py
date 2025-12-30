
import sqlite3
import datetime

DB_PATH = 'backend/campus.db'

def create_dummy_post():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 1. Get User
    c.execute("SELECT id, uid, full_name, email FROM users LIMIT 1")
    user = c.fetchone()
    
    if not user:
        print("No users found!")
        return

    print(f"Creating post for User: {user[2]} (ID: {user[0]})")
    
    # 2. Create Post
    title = "Test Post Visibility"
    body = "This is a test post to verify the profile grid."
    media = '["https://picsum.photos/400/500"]'
    
    c.execute("""
        INSERT INTO posts (author_id, title, content_body, type, media_urls_json, created_at, likes_count, comments_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (user[0], title, body, 'post', media, datetime.datetime.utcnow(), 0, 0))
    
    post_id = c.lastrowid
    print(f"Post created with ID: {post_id}")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    create_dummy_post()
