import sys
import os

# Add current directory to sys.path
sys.path.append(os.getcwd())

from lib.db.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
tables = inspector.get_table_names()
print("Tables in DB:", tables)

if 'comments' in tables:
    print("Comments table EXISTS.")
else:
    print("Comments table MISSING.")
