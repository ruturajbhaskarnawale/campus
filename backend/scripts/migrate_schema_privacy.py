
import sys
import sqlite3
import os

log_file = "backend/MIGRATION_LOG_PRIVACY.md"
db_path = "backend/campus.db"

with open(log_file, "w") as f:
    f.write("# Migration Log Privacy\n\n")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        f.write("## Checking Users Table for is_private\n")
        cursor.execute("PRAGMA table_info(users)")
        existing_cols = {row[1] for row in cursor.fetchall()}
        
        if 'is_private' not in existing_cols:
             f.write("- Adding column `is_private` (BOOLEAN DEFAULT 0)...\n")
             cursor.execute("ALTER TABLE users ADD COLUMN is_private BOOLEAN DEFAULT 0")
        else:
             f.write("- Column `is_private` exists.\n")

        conn.commit()
        f.write("\n**Migration Completed.**\n")
        
    except Exception as e:
        f.write(f"\n**ERROR**: {e}\n")
    finally:
        conn.close()
