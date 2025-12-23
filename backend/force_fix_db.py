import sys
import os
import sqlite3

# Logging
log_file = "fix_result.txt"
def log(msg):
    with open(log_file, "a") as f:
        f.write(msg + "\n")
    print(msg)

# Setup path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

try:
    from lib.db.database import init_db, DB_PATH
    log(f"DB Path from config: {DB_PATH}")

    # Run init_db
    log("Running init_db()...")
    init_db()
    log("init_db() completed.")

    # Check tables
    if os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        log(f"Tables found: {tables}")
        
        if 'comments' in tables:
            log("SUCCESS: comments table exists.")
        else:
            log("FAILURE: comments table NOT found.")
        
        conn.close()
    else:
        log(f"FAILURE: DB file not found at {DB_PATH}")

except Exception as e:
    log(f"EXCEPTION: {e}")
