from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
import os

# Ensure the database directory exists
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, 'campus.db')

# --- Database Connection Config ---
import urllib.parse

def get_db_engine():
    """
    Returns the SQLAlchemy engine. 
    Prioritizes DATABASE_URL env var or hardcoded PG URL if switching.
    Falls back to SQLite.
    """
    # Check for Postgres URL
    # Hardcoded for this migration/user request - in production use os.getenv('DATABASE_URL')
    # User-provided: postgresql://postgres:Lucky@2005@localhost:5432/campus_hub
    
    # We must handle the password encoding safely precisely as we did in migration script
    raw_pg_url = os.getenv('DATABASE_URL', 'postgresql://postgres:Lucky@2005@localhost:5432/campus_hub')
    
    # If it is postgres, ensure safe encoding
    if raw_pg_url and raw_pg_url.startswith('postgres'):
        try:
             # Basic check to see if we need to encode (if there is an @ in the password part)
             # This is a simple heuristic: if there are 2 @ symbols, we likely need to encode the first one
             if raw_pg_url.count('@') > 1:
                scheme, remainder = raw_pg_url.split("://", 1)
                auth_part, host_db = remainder.rsplit("@", 1)
                user, password = auth_part.split(":", 1)
                safe_password = urllib.parse.quote_plus(password)
                safe_url = f"{scheme}://{user}:{safe_password}@{host_db}"
                return create_engine(safe_url, pool_pre_ping=True)
             else:
                return create_engine(raw_pg_url, pool_pre_ping=True)
        except:
             # If parsing fails, try using it raw (or manual string fix)
             # Manual fix for the specific known password:
             if 'Lucky@2005' in raw_pg_url:
                 fixed_url = raw_pg_url.replace('Lucky@2005', 'Lucky%402005')
                 return create_engine(fixed_url, pool_pre_ping=True)
             return create_engine(raw_pg_url, pool_pre_ping=True)
             
    # Fallback to SQLite
    return create_engine(f'sqlite:///{DB_PATH}', connect_args={'check_same_thread': False})

engine = get_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Thread-safe session registry
# This enables us to use a scoped session in Flask contexts easily
db_session = scoped_session(SessionLocal)

Base = declarative_base()
Base.query = db_session.query_property()

def init_db():
    # Import all models here so they register with metadata
    import lib.db.models
    Base.metadata.create_all(bind=engine)

def get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()
