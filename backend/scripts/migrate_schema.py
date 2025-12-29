
import sys
import sqlite3
import os

log_file = "backend/MIGRATION_LOG.md"
db_path = "backend/campus.db"

if not os.path.exists(db_path):
    # Try alternate location
    if os.path.exists("instance/campus.db"):
        db_path = "instance/campus.db"
    
with open(log_file, "w") as f:
    f.write("# Migration Log\n\n")
    if not os.path.exists(db_path):
        f.write(f"ERROR: DB not found at {db_path}\n")
        sys.exit(1)
        
    f.write(f"Target DB: `{db_path}`\n\n")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. Check USERS table
        f.write("## Users Table\n")
        cursor.execute("PRAGMA table_info(users)")
        existing_cols = {row[1] for row in cursor.fetchall()}
        f.write(f"Existing columns: {list(existing_cols)}\n\n")
        
        cols_to_add = {
            'followers_count': 'INTEGER DEFAULT 0',
            'following_count': 'INTEGER DEFAULT 0',
            'xp_points': 'INTEGER DEFAULT 0',
            'level': 'INTEGER DEFAULT 1',
            'github_url': 'TEXT',
            'linkedin_url': 'TEXT',
            'website_url': 'TEXT',
            'views_count': 'INTEGER DEFAULT 0' # Used in profile routes
        }
        
        for col, dtype in cols_to_add.items():
            if col not in existing_cols:
                f.write(f"- Adding column `{col}` ({dtype})...\n")
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {dtype}")
            else:
                f.write(f"- Column `{col}` already exists.\n")
                
        # 2. Check SavedPosts table
        # If accessing s.post fails, it might be due to missing foreign key integration or just logic. 
        # But let's check if table exists.
        f.write("\n## SavedPosts Table\n")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='saved_posts'")
        if not cursor.fetchone():
             f.write("- Table `saved_posts` MISSING! Creating...\n")
             # Minimal creation based on model
             cursor.execute("""
                CREATE TABLE saved_posts (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    post_id INTEGER,
                    note TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(post_id) REFERENCES posts(id)
                )
             """)
        else:
             f.write("- Table `saved_posts` exists.\n")

        conn.commit()
        f.write("\n**Migration Completed Successfully.**\n")
        
    except Exception as e:
        f.write(f"\n**ERROR**: {e}\n")
        conn.rollback()
    finally:
        conn.close()
