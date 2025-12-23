from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
import os

# Ensure the database directory exists
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, 'campus.db')

# SQLite/SQLAlchemy Setup
engine = create_engine(f'sqlite:///{DB_PATH}', connect_args={'check_same_thread': False})
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
