import sys
import os
print("Python works")
try:
    import bcrypt
    print("bcrypt imported")
    from sqlalchemy import create_engine
    print("sqlalchemy imported")
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from lib.db.models import User
    print("User model imported")
except Exception as e:
    print(f"Error: {e}")
