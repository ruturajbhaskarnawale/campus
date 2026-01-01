import sys
import os
import urllib.parse
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

# Add backend to path to import models
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from lib.db.database import get_db_engine, DB_PATH

# 1. Connect to SQLite (Explicitly)
SQLITE_URL = f"sqlite:///{DB_PATH}"
sqlite_engine = create_engine(SQLITE_URL)

# 2. Connect to Postgres (using our configured get_db_engine which defaults to PG now)
# We need to make sure get_db_engine() returns the PG engine.
pg_engine = get_db_engine() # This should be the PG engine because of my change to database.py

def verify():
    print(f"--- MIGRATION VERIFICATION ---")
    print(f"SQLite Source: {SQLITE_URL}")
    print(f"Postgres Target: {pg_engine.url}")

    if 'sqlite' in str(pg_engine.url):
        print("!! WARNING: Application is still using SQLite engine. Check DATABASE_URL or database.py logic.")
        # Try to force PG connection for verification
        raw_pg_url = "postgresql://postgres:Lucky@2005@localhost:5432/campus_hub"
        # Manual safe construction
        if 'Lucky@2005' in raw_pg_url:
             fixed_url = raw_pg_url.replace('Lucky@2005', 'Lucky%402005')
             pg_engine_force = create_engine(fixed_url)
             print(f"   Forcing connection to: {fixed_url}")
             compare_dbs(sqlite_engine, pg_engine_force)
             return

    compare_dbs(sqlite_engine, pg_engine)

def compare_dbs(src_engine, tgt_engine):
    src_inspector = inspect(src_engine)
    tgt_inspector = inspect(tgt_engine)
    
    src_tables = set(src_inspector.get_table_names())
    tgt_tables = set(tgt_inspector.get_table_names())
    
    print("\n[Table Existence Check]")
    missing_in_tgt = src_tables - tgt_tables
    if missing_in_tgt:
        print(f"X MISSING tables in Target: {missing_in_tgt}")
    else:
        print(f"√ All {len(src_tables)} tables present in Target.")

    print("\n[Row Count Check]")
    all_match = True
    for table in sorted(src_tables):
        # Skip internal tables if any (sqlite_sequence)
        if table == 'sqlite_sequence': continue
        
        with src_engine.connect() as s_conn:
            s_count = s_conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            
        with tgt_engine.connect() as t_conn:
            t_count = t_conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            
        if s_count == t_count:
            print(f"√ {table:<25} OK ({s_count})")
        else:
            print(f"X {table:<25} MISMATCH! (SQLite: {s_count} | PG: {t_count})")
            all_match = False
            
    if all_match:
        print("\n>> VERIFICATION SUCCESSFUL: Data Integrity 100% (Row Counts Match)")
    else:
        print("\n>> VERIFICATION FAILED: Row count mismatch detected.")
    sys.stdout.flush()

if __name__ == "__main__":
    verify()
