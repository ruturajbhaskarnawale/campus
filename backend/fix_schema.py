import os
import sys
from lib.db.database import init_db, engine
from lib.db.models import PostLike, SavedPost

# Add path to ensure imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

def fix_schema():
    print("Attempting to create missing tables...", flush=True)
    try:
        # verify engine connection
        with engine.connect() as conn:
            print("Database connection successful.", flush=True)
            
        # Create all tables (skips existing ones)
        init_db()
        print("Schema update completed successfully! Missing tables should be created.", flush=True)
        
    except Exception as e:
        print(f"Error updating schema: {e}", flush=True)
        print("If this fails, please STOP the backend server and try again.", flush=True)

if __name__ == "__main__":
    fix_schema()
