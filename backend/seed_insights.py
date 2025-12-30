
import sqlite3
import random
from datetime import datetime, timedelta

DB_PATH = 'campus.db'

def seed_insights():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Fetch existing users
    cursor.execute("SELECT id, username FROM users LIMIT 10")
    users = cursor.fetchall()
    
    if not users:
        print("No users found to seed.")
        return

    print(f"Found {len(users)} users. Seeding data...")

    for user_id, username in users:
        # 2. Update User Stats (views, impressions)
        views = random.randint(100, 5000)
        impressions = views * random.randint(2, 5)
        
        cursor.execute(
            "UPDATE users SET views_count = ?, impressions_count = ? WHERE id = ?",
            (views, impressions, user_id)
        )
        print(f"Updated stats for {username}: {views} views, {impressions} impressions")

        # 3. Create 5 DailyInsight records for each user
        # Generate for last 5 days
        for i in range(5):
            date = datetime.utcnow() - timedelta(days=i)
            daily_views = random.randint(10, 100)
            daily_impressions = daily_views * random.randint(2, 5)
            new_follows = random.randint(0, 5)
            
            cursor.execute("""
                INSERT INTO daily_insights (user_id, date, views, impressions, new_follows)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, date, daily_views, daily_impressions, new_follows))
            
    conn.commit()
    conn.close()
    print("Seeding completed successfully.")

if __name__ == "__main__":
    seed_insights()
