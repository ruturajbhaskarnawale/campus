
import sys
import sqlite3
import os

output_file = "backend/scripts/schema_check.txt"
with open(output_file, "w") as f:
    f.write("Checking DB Schema...\n")
    
    # Try multiple paths
    paths = ["backend/instance/campus.db", "backend/campus.db", "instance/campus.db"]
    db_path = None
    for p in paths:
        if os.path.exists(p):
            db_path = p
            break
            
    if not db_path:
        f.write("DB not found in expected paths.\n")
        # List dirs to help debug
        f.write(f"CWD: {os.getcwd()}\n")
        if os.path.exists("backend"):
            f.write(f"backend contents: {os.listdir('backend')}\n")
        sys.exit(1)

    f.write(f"Using DB: {db_path}\n")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        f.write("Columns in 'users' table:\n")
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        f.write(str(columns) + "\n")
        
        required = ['github_url', 'xp_points', 'followers_count', 'following_count', 'level']
        missing = [c for c in required if c not in columns]
        if missing:
            f.write(f"MISSING COLUMNS: {missing}\n")
        else:
            f.write("All required columns present.\n")
            
    except Exception as e:
        f.write(f"Error: {e}\n")
    finally:
        conn.close()
