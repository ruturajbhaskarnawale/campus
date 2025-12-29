
import sys
import sqlite3
import os

log_file = "backend/MIGRATION_LOG_RESUME.md"
db_path = "backend/campus.db"

with open(log_file, "w") as f:
    f.write("# Migration Log Resume\n\n")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        f.write("## Checking Users Table for resume_url\n")
        cursor.execute("PRAGMA table_info(users)")
        existing_cols = {row[1] for row in cursor.fetchall()}
        
        if 'resume_url' not in existing_cols:
             f.write("- Adding column `resume_url` (TEXT)...\n")
             cursor.execute("ALTER TABLE users ADD COLUMN resume_url TEXT")
        else:
             f.write("- Column `resume_url` exists.\n")

        conn.commit()
        f.write("\n**Migration Completed.**\n")
        
    except Exception as e:
        f.write(f"\n**ERROR**: {e}\n")
    finally:
        conn.close()
