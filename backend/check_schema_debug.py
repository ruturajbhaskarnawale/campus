import sqlite3
import os

def check_schema():
    db_path = os.path.join(os.getcwd(), 'campus.db')
    if not os.path.exists(db_path):
        print("db not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("PRAGMA table_info(users)")
        columns = [info[1] for info in cursor.fetchall()]
        print(f"User Columns: {columns}")
        
        missing = []
        if 'followers_count' not in columns: missing.append('followers_count')
        if 'following_count' not in columns: missing.append('following_count')
        
        if missing:
            print(f"MISSING COLUMNS: {missing}")
        else:
            print("Schema looks correct.")
            
    except Exception as e:
        print(e)
    finally:
        conn.close()

if __name__ == "__main__":
    check_schema()
