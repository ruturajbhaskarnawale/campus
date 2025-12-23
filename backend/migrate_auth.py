import sys
import os
sys.path.append(os.getcwd())

try:
    from lib.db.database import engine, db_session, Base
    from lib.db.models import User, PostLike, SavedPost
    from sqlalchemy import text
    import bcrypt
except Exception as e:
    print(f"Import Error: {e}")
    exit(1)

def migrate():
    print("Starting migration...")
    
    # 1. Add password_hash column if not exists
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
            print("Added password_hash column.")
        except Exception as e:
            print(f"Column password_hash likely exists or error: {e}")

    # 2. Create new tables
    Base.metadata.create_all(bind=engine)
    print("Created new tables (PostLike, SavedPost) if they didn't exist.")

    # 3. Update existing users
    session = db_session()
    users = session.query(User).all()
    
    default_pw_hash = bcrypt.hashpw('password123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    count = 0
    for u in users:
        # Update email to .edu if not already
        if not u.email.endswith('.edu') and not u.email.endswith('.ac.in'):
            # simple strategy: append .edu or replace domain? 
            # User said "change the emails to .edu extension"
            # let's replace the TLD or append
            if '@' in u.email:
                local, domain = u.email.split('@')
                if '.' in domain:
                    u.email = f"{local}@{domain.split('.')[0]}.edu"
                else:
                    u.email = f"{u.email}.edu"
            else:
                u.email = f"{u.email}.edu"
            print(f"Updated email for {u.username} to {u.email}")
            
        # Set default password
        if not u.password_hash:
            u.password_hash = default_pw_hash
            
        count += 1

    try:
        session.commit()
        print(f"Updated {count} users.")
    except Exception as e:
        session.rollback()
        print(f"Error updating users: {e}")
    finally:
        session.close()

    print("Migration complete.")

if __name__ == "__main__":
    migrate()
