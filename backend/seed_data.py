import firebase_admin
from firebase_admin import credentials, firestore
import datetime
import os
import sys

# Ensure we can import lib
sys.path.append(os.getcwd())

def seed_posts():
    cred_path = "serviceAccountKey.json"
    if not os.path.exists(cred_path):
        print("Error: serviceAccountKey.json not found.")
        return

    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        posts_ref = db.collection('posts')

        # Check existing
        existing = list(posts_ref.limit(1).stream())
        if len(existing) > 0:
            print("Database already has posts. Skipping seed.")
            return

        print("Seeding sample posts...")
        
        samples = [
            {
                'title': 'Campus Project Hub',
                'description': 'A centralized platform for students to showcase projects and find teammates. Built with React Native and Flask.',
                'skills_needed': ['React Native', 'Python', 'Firebase'],
                'author_name': 'Admin',
                'author_uid': 'seed_admin',
                'status': 'active',
                'visibility': 'public',
                'likes': 10,
                'comments_count': 2,
                'timestamp': datetime.datetime.now()
            },
            {
                'title': 'AI Study Buddy',
                'description': 'An intelligent chatbot that helps you study by generating quizzes from PDF notes using OpenAI API.',
                'skills_needed': ['AI/ML', 'Python', 'FastAPI'],
                'author_name': 'Sarah Lee',
                'author_uid': 'seed_sarah',
                'status': 'active',
                'visibility': 'public',
                'likes': 25,
                'comments_count': 5,
                'timestamp': datetime.datetime.now() - datetime.timedelta(hours=2)
            },
            {
                'title': 'EcoTrack Mobile App',
                'description': 'Track your carbon footprint and get daily challenges to reduce waste. Looking for UI/UX designers!',
                'skills_needed': ['Mobile', 'Design', 'Flutter'],
                'author_name': 'Mike Chen',
                'author_uid': 'seed_mike',
                'status': 'active',
                'visibility': 'public',
                'likes': 5,
                'comments_count': 0,
                'timestamp': datetime.datetime.now() - datetime.timedelta(days=1)
            }
        ]

        for p in samples:
            doc_ref = posts_ref.document()
            p['id'] = doc_ref.id
            doc_ref.set(p)
            print(f"Created post: {p['title']}")

        print("Seeding complete!")

    except Exception as e:
        print(f"Seeding failed: {e}")

if __name__ == '__main__':
    seed_posts()
