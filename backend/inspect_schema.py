import sqlite3

def check_schema():
    conn = sqlite3.connect('campus.db')
    cursor = conn.cursor()
    
    tables = ['users', 'posts', 'notifications']
    for table in tables:
        print(f"--- Schema for {table} ---")
        try:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            col_names = [c[1] for c in columns]
            print(f"Columns in {table}: {col_names}")
            if table == 'users':
                required = ['password_hash', 'xp_points', 'role']
                for r in required:
                    if r not in col_names:
                        print(f"MISSING COLUMN: {r}")
                    else:
                        print(f"Verified: {r}")
        except Exception as e:
            print(f"Error: {e}")
            
    conn.close()

if __name__ == "__main__":
    check_schema()
