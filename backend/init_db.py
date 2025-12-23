from lib.db.database import init_db
import os

if __name__ == "__main__":
    print("Initializing Database...")
    try:
        init_db()
        print("Database tables created successfully at 'backend/campus.db'.")
    except Exception as e:
        print(f"Error creating database: {e}")
