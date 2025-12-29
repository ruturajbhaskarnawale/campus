
import sys
import sqlite3
import os

log_file = "backend/MIGRATION_LOG_2.md"
db_path = "backend/campus.db"

with open(log_file, "w") as f:
    f.write("# Migration Log 2\n\n")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        f.write("## Checking Junction Tables\n")
        
        # Check user_skills
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_skills'")
        if not cursor.fetchone():
             f.write("- Table `user_skills` MISSING! Creating...\n")
             cursor.execute("""
                CREATE TABLE user_skills (
                    user_id INTEGER,
                    skill_id INTEGER,
                    level VARCHAR(50) DEFAULT 'Beginner',
                    endorsements_count INTEGER DEFAULT 0,
                    is_primary BOOLEAN DEFAULT 0,
                    verified_by_json JSON,
                    added_at TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(skill_id) REFERENCES skills(id)
                )
             """)
             f.write("  - Created `user_skills`.\n")
        else:
             f.write("- Table `user_skills` exists.\n")

        conn.commit()
        f.write("\n**Check Completed.**\n")
        
    except Exception as e:
        f.write(f"\n**ERROR**: {e}\n")
    finally:
        conn.close()
