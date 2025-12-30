
import sqlite3
import os

DB_PATH = 'campus.db'

def run_migration():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Add columns to users table
    try:
        cursor.execute("SELECT views_count FROM users LIMIT 1")
    except sqlite3.OperationalError:
        print("Adding views_count to users...")
        cursor.execute("ALTER TABLE users ADD COLUMN views_count INTEGER DEFAULT 0")
    
    try:
        cursor.execute("SELECT impressions_count FROM users LIMIT 1")
    except sqlite3.OperationalError:
        print("Adding impressions_count to users...")
        cursor.execute("ALTER TABLE users ADD COLUMN impressions_count INTEGER DEFAULT 0")

    # 2. Create daily_insights table
    # Schema matches models.py: id, user_id, date, views, impressions, new_follows
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS daily_insights (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        views INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        new_follows INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
    """
    cursor.execute(create_table_sql)
    print("Ensured daily_insights table exists.")

    conn.commit()
    conn.close()
    print("Migration completed successfully.")

if __name__ == "__main__":
    run_migration()
