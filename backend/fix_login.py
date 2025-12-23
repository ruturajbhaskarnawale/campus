import sys
import os

# Ensure backend is in path
sys.path.append(os.getcwd())

try:
    from lib.db.database import init_db, db_session
    from lib.db.models import User
    import bcrypt
    import uuid
except Exception as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def fix_user():
    init_db()
    session = db_session
    
    email = "ruturaj@university.edu"
    password = "password123"
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = session.query(User).filter(User.email == email).first()
    
    if user:
        print(f"User {email} exists. Updating password...")
        user.password_hash = hashed
        # Ensure uid is present
        if not user.uid:
            user.uid = str(uuid.uuid4())
        session.commit()
        print("User password updated successfully.")
    else:
        print(f"User {email} not found. Creating...")
        new_user = User(
            uid=str(uuid.uuid4()),
            username=email.split('@')[0],
            email=email,
            full_name="Ruturaj (Fixed)",
            password_hash=hashed,
            role='Student',
            avatar_url=f"https://ui-avatars.com/api/?name=Ruturaj+Fixed&background=random"
        )
        session.add(new_user)
        session.commit()
        print("User created successfully.")

    # Verify
    u = session.query(User).filter(User.email == email).first()
    print(f"VERIFICATION: User {u.email} has hash starting with {u.password_hash[:10]}...")

if __name__ == "__main__":
    try:
        fix_user()
    except Exception as e:
        print(f"Execution Error: {e}")
