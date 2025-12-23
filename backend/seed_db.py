import random
from faker import Faker
from datetime import datetime
from lib.db.database import db_session, init_db
from lib.db.models import (
    User, Post, Project, Comment, Notification, Follow, 
    Skill, Conversation, Message, AppSettings, SearchHistory,
    user_skills
)
import bcrypt

fake = Faker()

def seed_data():
    session = db_session
    
    print("Clearing existing data...")
    # Order matters for foreign keys
    session.query(Message).delete()
    session.query(Conversation).delete()
    session.query(Comment).delete()
    session.query(Project).delete()
    session.query(Post).delete()
    session.query(Follow).delete()
    session.query(AppSettings).delete()
    session.query(User).delete()
    session.query(Skill).delete()
    session.commit()

    print("Seeding Skills...")
    skills = ['Python', 'React', 'Node.js', 'Flutter', 'Design', 'SQL', 'AI/ML', 'DevOps']
    skill_objs = []
    for s in skills:
        sk = Skill(name=s, category='Tech')
        session.add(sk)
        skill_objs.append(sk)
    session.commit()

    print("Seeding Users...")
    users = []
    # Create a test user
    test_user = User(
        uid='test_uid_123',
        username='testuser',
        email='test@example.com',
        full_name='Test Student',
        password_hash=bcrypt.hashpw('password'.encode('utf-8'), bcrypt.gensalt()),
        role='Student',
        bio='I am a test user.',
        is_verified=True
    )
    session.add(test_user)
    users.append(test_user)

    for _ in range(10):
        u = User(
            uid=fake.uuid4(),
            username=fake.user_name(),
            email=fake.email(),
            full_name=fake.name(),
            password_hash=bcrypt.hashpw('password'.encode('utf-8'), bcrypt.gensalt()),
            role=random.choice(['Student', 'Alumni', 'Professor']),
            bio=fake.text(max_nb_chars=100),
            avatar_url=f"https://i.pravatar.cc/150?u={random.randint(1,1000)}",
            university='Stanford University',
            department='Computer Science',
            graduation_year=2025
        )
        session.add(u)
        users.append(u)
    session.commit()
    
    # Assign Skills
    print("Assigning Skills...")
    for u in users:
        # Assign 2-3 random skills
        u_skills = random.sample(skill_objs, k=random.randint(2, 4))
        for s in u_skills:
            u.skills.append(s)
    session.commit()

    print("Seeding Posts & Projects...")
    for u in users:
        # Create 1-3 posts per user
        for _ in range(random.randint(1, 3)):
            is_project = random.choice([True, False])
            post_type = 'project' if is_project else 'post'
            
            p = Post(
                author_id=u.id,
                title=fake.sentence(),
                content_body=fake.paragraph(),
                type=post_type,
                category=random.choice(skills),
                likes_count=random.randint(0, 50)
            )
            session.add(p)
            session.flush() # get ID
            
            if is_project:
                proj = Project(
                    post_id=p.id,
                    owner_id=u.id,
                    status='recruiting',
                    difficulty_level='Intermediate',
                    team_size_max=4
                )
                session.add(proj)
    session.commit()
    
    print("Seeding Follows...")
    # Circular follows
    for i in range(len(users) - 1):
        f = Follow(follower_id=users[i].id, followed_id=users[i+1].id)
        session.add(f)
    session.commit()

    print("Database seeding completed!")

if __name__ == "__main__":
    init_db()
    seed_data()
