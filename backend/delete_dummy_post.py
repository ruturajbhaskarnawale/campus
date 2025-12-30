
import sqlite3

DB_PATH = 'backend/campus.db'

def delete_dummy_post():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    title = "Test Post Visibility"
    
    c.execute("SELECT id FROM posts WHERE title = ?", (title,))
    post = c.fetchone()
    
    if post:
        print(f"Found dummy post with ID: {post[0]}. Deleting...")
        c.execute("DELETE FROM posts WHERE id = ?", (post[0],))
        conn.commit()
        print("Dummy post deleted.")
    else:
        print("Dummy post not found.")
        
    conn.close()

if __name__ == "__main__":
    delete_dummy_post()
