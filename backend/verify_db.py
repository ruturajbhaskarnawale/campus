import sqlite3
import os
import sys

def check_tables():
    # Construct path same as database.py
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, 'campus.db')
    
    print(f"Checking DB at: {db_path}", flush=True)
    if not os.path.exists(db_path):
        print(f"Database file not found!", flush=True)
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"Existing tables: {tables}", flush=True)
        
        required = ['post_likes', 'saved_posts']
        missing = [t for t in required if t not in tables]
        
        if missing:
            print(f"MISSING TABLES: {missing}", flush=True)
        else:
            print("All required tables present.", flush=True)
            
        conn.close()
    except Exception as e:
        print(f"Error checking DB: {e}", flush=True)

if __name__ == "__main__":
    check_tables()

