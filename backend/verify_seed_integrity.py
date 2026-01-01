
import sqlite3
import bcrypt
import sys
import os

DB_NAME = 'campus.db'

def verify_integrity():
    if not os.path.exists(DB_NAME):
        print(f"Error: {DB_NAME} not found.")
        return

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    print("--- Database Integrity Verification ---\n")
    
    # 1. Row Counts
    tables = [
        'users', 'posts', 'projects', 'comments', 'notifications', 
        'follows', 'skills', 'user_skills', 'app_settings', 'daily_insights'
    ]
    
    print("row_counts = {")
    all_passed = True
    for table in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  '{table}': {count},")
            if count < 100: # Soft check, expectation is higher
                print(f"  -- WARNING: Low count for {table}")
        except Exception as e:
            print(f"  -- ERROR checking {table}: {e}")
            all_passed = False
    print("}\n")
    
    # 2. Orphan Checks
    print("Orphan Checks:")
    # Posts without valid Authors
    cursor.execute("SELECT COUNT(*) FROM posts WHERE author_id NOT IN (SELECT id FROM users)")
    orphans = cursor.fetchone()[0]
    if orphans > 0:
        print(f"  [FAIL] Found {orphans} posts with invalid author_id")
        all_passed = False
    else:
        print(f"  [PASS] All posts have valid authors")

    # Comments without valid Posts
    cursor.execute("SELECT COUNT(*) FROM comments WHERE post_id NOT IN (SELECT id FROM posts)")
    orphans = cursor.fetchone()[0]
    if orphans > 0:
        print(f"  [FAIL] Found {orphans} comments with invalid post_id")
        all_passed = False
    else:
        print(f"  [PASS] All comments belong to valid posts")
        
    # 3. Login Check
    print("\nLogin Compatibility Check:")
    cursor.execute("SELECT email, password_hash FROM users LIMIT 1")
    user = cursor.fetchone()
    if user:
        email, hashed = user
        # Check against 'password123'
        if isinstance(hashed, str): hashed = hashed.encode('utf-8')
        try:
            if bcrypt.checkpw(b'password123', hashed):
                print(f"  [PASS] User '{email}' can login with 'password123'")
            else:
                print(f"  [FAIL] Password check failed for '{email}'")
                all_passed = False
        except Exception as e:
            print(f"  [FAIL] Bcrypt error: {e}")
            all_passed = False
    else:
        print("  [FAIL] No users found to test login")
        all_passed = False

    conn.close()
    
    if all_passed:
        print("\nAll checks PASSED successfully.")
    else:
        print("\nSome checks FAILED.")

if __name__ == "__main__":
    verify_integrity()
