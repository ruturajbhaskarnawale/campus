from lib.db.database import db_session
from lib.db.models import User
import sys

try:
    session = db_session
    email = "ritik" # User said "ritik 1234", maybe they used username as email? Frontend might send username in email field?
    # The login route expects 'email'.
    # If user entered 'ritik' in email field, and backend looks for email, it might fail to find user if it's not an email.
    
    # Check if 'ritik' matches email OR username
    print(f"Searching for 'ritik'...")
    u = session.query(User).filter((User.email == 'ritik') | (User.username == 'ritik')).first()
    
    if u:
        print(f"Found User: {u.uid}, {u.email}, {u.username}")
        print(f"Password Hash: {u.password_hash}")
        if u.password_hash:
            print(f"Hash Type: {type(u.password_hash)}")
    else:
        print("User 'ritik' not found.")
        
    # List all users
    all_users = session.query(User).all()
    print(f"\nTotal Users: {len(all_users)}")
    for user in all_users:
        print(f"- {user.username} ({user.email}) HashLen: {len(user.password_hash) if user.password_hash else 'None'}")

except Exception as e:
    print(f"Error: {e}")
