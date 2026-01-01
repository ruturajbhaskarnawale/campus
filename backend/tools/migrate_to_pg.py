import sys
import os
import urllib.parse
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Add backend to path to import models
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from lib.db.models import Base, User, Post, Project, Comment, Notification, Follow, Skill, Conversation, Message, AppSettings, SearchHistory, Report, PostLike, SavedPost, DailyInsight
# Import junction tables - we need to reflect them or import them if they are Table objects
from lib.db.models import user_skills, conversation_participants

# --- CONFIGURATION ---
SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), '../campus.db')
SQLITE_URL = f"sqlite:///{SQLITE_DB_PATH}"

# Parse the provided Postgres URL to handle special characters in password
# User provided: postgresql://postgres:Lucky@2005@localhost:5432/campus_hub
# We need to encode 'Lucky@2005' -> 'Lucky%402005'
# RAW_PG_URL = "postgresql://postgres:Lucky@2005@localhost:5432/campus_hub"
RAW_PG_URL = "postgresql://neondb_owner:npg_0tfaAlPgM6QI@ep-shiny-shape-a4rjm3jm.us-east-1.aws.neon.tech/neondb?sslmode=require"

def get_safe_pg_url(raw_url):
    try:
        # manual parsing to be safe with the double @
        # format: scheme://user:password@host:port/dbname
        if "@" not in raw_url: return raw_url
        
        scheme, remainder = raw_url.split("://", 1)
        # Split from the right to get host/db
        auth_part, host_db = remainder.rsplit("@", 1)
        
        user, password = auth_part.split(":", 1)
        safe_password = urllib.parse.quote_plus(password)
        
        return f"{scheme}://{user}:{safe_password}@{host_db}"
    except Exception as e:
        print(f"Error parsing URL: {e}")
        return raw_url

POSTGRES_URL = get_safe_pg_url(RAW_PG_URL)

def migrate():
    print(f"--- DATABASE MIGRATION START ---")
    print(f"Source: {SQLITE_URL}")
    print(f"Target: {RAW_PG_URL} (Encoded password)")

    # 1. Connect to SQLite
    sqlite_engine = create_engine(SQLITE_URL)
    SQLiteSession = sessionmaker(bind=sqlite_engine)
    sqlite_session = SQLiteSession()
    
    # 2. Connect to Postgres
    pg_engine = create_engine(POSTGRES_URL)
    PgSession = sessionmaker(bind=pg_engine)
    pg_session = PgSession()

    # 3. Create Tables in Postgres
    print("\n>> Creating tables in PostgreSQL...")
    Base.metadata.drop_all(pg_engine) # OPTIONAL: Clear target to ensure fresh start
    Base.metadata.create_all(pg_engine)
    print("   Tables created.")

    # 4. Data Transfer Order (Respecting Foreign Keys)
    # Order: Users -> DailyInsights, Skills, Conversations -> Messages, Posts -> Projects, Comments -> Replies
    
    # We can inspect the metadata to get all tables, but manual order is safer for specific dependencies
    # Or we can disable FK checks, but that is risky. Let's do ordered insert.
    
    models_to_migrate = [
        (User, "users"),
        (AppSettings, "app_settings"),
        (Skill, "skills"),
        (DailyInsight, "daily_insights"),
        (Follow, "follows"),
        (Conversation, "conversations"),
        (Message, "messages"),
        (Post, "posts"),
        (PostLike, "post_likes"),
        (SavedPost, "saved_posts"),
        (Project, "projects"),
        (Comment, "comments"), # Be careful with self-referential FK here? SQLAlchemy handles it if we insert parents first? 
                               # Actually bulk insert might fail if parents aren't there. 
                               # We might need to insert comments in ID order assuming parents have lower IDs.
        (Notification, "notifications"),
        (SearchHistory, "search_history"),
        (Report, "reports")
    ]
    
    # Junction tables need special handling as they are not Classes
    junction_tables = [
        (user_skills, "user_skills"),
        (conversation_participants, "conversation_participants")
    ]

    try:
        for model, table_name in models_to_migrate:
            print(f"\n>> Migrating table: {table_name}...")
            # Fetch all from SQLite
            if model == Comment:
                # fetch in order of id ASC to ensure parents exist (mostly)
                records = sqlite_session.query(model).order_by(model.id.asc()).all()
            else:
                try:
                    records = sqlite_session.query(model).all()
                except Exception as e:
                     print(f"Skipping {table_name} (Error reading source): {e}")
                     continue

            if not records:
                print(f"   No records found.")
                continue
                
            print(f"   Found {len(records)} records. Inserting...")
            
            # Detach from sqlite session to insert into pg
            for record in records:
                sqlite_session.expunge(record)
                pg_session.merge(record) # Update if exists, or insert. efficient.
            
            pg_session.flush()
            print(f"   Done.")
            
        # Junction Tables
        print("\n>> Migrating junction tables...")
        for table, name in junction_tables:
            print(f"   Migrating {name}...")
            # Read using core sqlalchemy
            rows = sqlite_session.execute(table.select()).fetchall()
            if rows:
                print(f"   Found {len(rows)} rows.")
                # Insert
                for row in rows:
                    pg_session.execute(table.insert().values(row._mapping))
            else:
                 print("   No rows.")
            pg_session.flush()


        pg_session.commit()
        print("\n>> Data Migration Complete.")

        # 5. Reset Sequences
        print("\n>> Resetting PostgreSQL Sequences (Fixing 'Duplicate Key' errors)...")
        # Find all tables with 'id' column
        inspector = inspect(pg_engine)
        for table_name in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns(table_name)]
            if 'id' in columns:
                # sequences are usually named tablename_id_seq
                # We can use specific PG command:
                # SELECT setval(pg_get_serial_sequence('tablename', 'id'), coalesce(max(id)+1, 1), false) FROM tablename;
                seq_fix_sql = f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), coalesce(max(id)+1, 1), false) FROM {table_name};"
                try:
                    pg_session.execute(text(seq_fix_sql))
                    # print(f"   Reset sequence for {table_name}")
                except Exception as e:
                    print(f"   Could not reset sequence for {table_name} (might not have serial id): {e}")
        
        pg_session.commit()
        print(">> Sequences Reset.")

    except Exception as e:
        pg_session.rollback()
        print(f"\n!!! MIGRATION FAILED !!!")
        print(e)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        sqlite_session.close()
        pg_session.close()
        
if __name__ == "__main__":
    migrate()
