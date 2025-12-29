
import sys
import sqlite3
import os

log_file = "backend/MIGRATION_LOG_3.md"
db_path = "backend/campus.db"

with open(log_file, "w") as f:
    f.write("# Migration Log 3\n\n")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        f.write("## Checking SavedPosts Columns\n")
        cursor.execute("PRAGMA table_info(saved_posts)")
        existing_cols = {row[1] for row in cursor.fetchall()}
        f.write(f"Existing: {list(existing_cols)}\n\n")
        
        # Check 'note'
        if 'note' not in existing_cols:
             f.write("- Adding column `note` (TEXT)...\n")
             cursor.execute("ALTER TABLE saved_posts ADD COLUMN note TEXT")
        else:
             f.write("- Column `note` exists.\n")

        conn.commit()
        f.write("\n**Check Completed.**\n")
        
    except Exception as e:
        f.write(f"\n**ERROR**: {e}\n")
    finally:
        conn.close()
