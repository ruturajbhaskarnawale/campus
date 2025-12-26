import sqlite3
import os

def fix_schema():
    db_path = os.path.join(os.getcwd(), 'campus.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Adding followers_count...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN followers_count INTEGER DEFAULT 0")
            print("Done.")
        except Exception as e:
            print(f"followers_count error (might exist): {e}")

        print("Adding following_count...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN following_count INTEGER DEFAULT 0")
            print("Done.")
        except Exception as e:
            print(f"following_count error (might exist): {e}")
            
        conn.commit()
        print("Schema update complete.")
        
    except Exception as e:
        print(f"Critical Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_schema()
