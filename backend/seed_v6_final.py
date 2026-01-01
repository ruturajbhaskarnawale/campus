
import sys
import os
import random
import uuid
import datetime
import bcrypt
import json
from faker import Faker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add current directory to path so we can import from lib
sys.path.append(os.getcwd())

from lib.db.database import Base, init_db
from lib.db.models import (
    User, DailyInsight, Post, Project, Comment, Notification, Follow, Skill, 
    Conversation, Message, AppSettings, SearchHistory, Report, PostLike, SavedPost,
    user_skills, conversation_participants
)

# Configuration
DB_NAME = 'campus.db'
NUM_USERS = 500
NUM_POSTS = 600
NUM_PROJECTS = 250
NUM_COMMENTS = 1500
NUM_NOTIFICATIONS = 1000
NUM_CONVERSATIONS = 200
SEED_VAL = 42

fake = Faker()
Faker.seed(SEED_VAL)
random.seed(SEED_VAL)

# Connect to DB
engine = create_engine(f'sqlite:///{DB_NAME}')
Session = sessionmaker(bind=engine)
session = Session()

# --- Content Generators ---

def get_tech_skills():
    return [
        "Python", "JavaScript", "React", "Node.js", "Java", "C++", "C#", "Go", "Rust", "Swift", 
        "Kotlin", "Flutter", "Django", "Flask", "FastAPI", "Spring Boot", "Laravel", "PostgreSQL", 
        "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Terraform", "Ansible", 
        "Jenkins", "Git", "Linux", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", 
        "NLP", "Computer Vision", "Data Science", "Pandas", "NumPy", "SQL", "Tableau", "Power BI", 
        "Cybersecurity", "Blockchain", "Solidity", "Web3", "UI/UX Design", "Figma", "DevOps"
    ]

def get_tech_universities():
    return [
        "MIT", "Stanford", "Berkeley", "Carnegie Mellon", "Georgia Tech", "Caltech", 
        "UIUC", "University of Washington", "Cornell", "Princeton", "UT Austin", 
        "IIT Bombay", "IIT Delhi", "IIT Madras", "BITS Pilani", "IIIT Hyderabad", 
        "University of Toronto", "Waterloo", "ETH Zurich", "Tsinghua University"
    ]

def generate_post_content():
    topics = ["AI", "Web Dev", "Mobile", "Cloud", "Data", "Cybersec", "Blockchain", "IoT"]
    actions = ["Built a new", "Launched", "Working on", "Learning", "Exploring", "Debugged", "Deployed"]
    return f"{random.choice(actions)} {random.choice(topics)} project using {random.choice(get_tech_skills())}. {fake.sentence()}"

# --- Seeding Functions ---

def seed_skills():
    print("Seeding Skills...")
    skills_list = get_tech_skills()
    for s_name in skills_list:
        existing = session.query(Skill).filter_by(name=s_name).first()
        if not existing:
            skill = Skill(
                name=s_name,
                category=random.choice(["Language", "Framework", "Tool", "Concept"]),
                icon_name="code",
                popularity_count=random.randint(10, 500)
            )
            session.add(skill)
    session.commit()
    print("Skills seeded.")

def seed_users():
    print(f"Seeding {NUM_USERS} Users...")
    
    # Pre-calculate common hash
    pw_hash = bcrypt.hashpw('password123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    universities = get_tech_universities()
    
    users = []
    for i in range(NUM_USERS):
        uid = str(uuid.uuid4())
        fname = fake.first_name()
        lname = fake.last_name()
        name = f"{fname} {lname}"
        username = f"{fname.lower()}.{lname.lower()}{random.randint(1, 999)}"
        # Ensure unique email/username (simple attempt)
        email = f"{username}@edu.com" 
        
        user = User(
            uid=uid,
            username=username,
            email=email,
            password_hash=pw_hash,
            full_name=name,
            avatar_url=f"https://ui-avatars.com/api/?name={name}&background=random",
            bio=fake.job(),
            role=random.choice(['Student', 'Student', 'Student', 'Professor', 'Alumni']),
            university=random.choice(universities),
            department=random.choice(["Computer Science", "Electrical Eng", "Information Systems"]),
            graduation_year=random.choice([2023, 2024, 2025, 2026]),
            location=fake.city(),
            github_url=f"https://github.com/{username}",
            linkedin_url=f"https://linkedin.com/in/{username}",
            xp_points=random.randint(0, 5000),
            level=random.randint(1, 20),
            followers_count=0, # Will update later
            following_count=0,
            account_status='active',
            last_active_at=datetime.datetime.utcnow()
        )
        users.append(user)
        
        # Batch commit every 100
        if len(users) >= 100:
            session.add_all(users)
            session.commit()
            users = []
            
    if users:
        session.add_all(users)
        session.commit()
    print("Users seeded.")

def seed_user_skills():
    print("Assigning Skills to Users...")
    all_users = session.query(User).all()
    all_skills = session.query(Skill).all()
    
    for user in all_users:
        # Assign 3-8 skills
        user_skills_selection = random.sample(all_skills, k=random.randint(3, 8))
        for skill in user_skills_selection:
            # We can't easily add extra fields to secondary relationship directly via list append 
            # if we want to set 'level'. But for now, simple append works for the association.
            # To set extra fields, we need to insert into the junction table directly.
            stmt = user_skills.insert().values(
                user_id=user.id,
                skill_id=skill.id,
                level=random.choice(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
                endorsements_count=random.randint(0, 20),
                is_primary=random.choice([True, False])
            )
            session.execute(stmt)
    session.commit()
    print("User Skills seeded.")

def seed_follows():
    print("Seeding Follows...")
    all_users = session.query(User).all()
    user_ids = [u.id for u in all_users]
    
    follows_data = []
    
    for u_id in user_ids:
        # Follow 5-20 random people
        targets = random.sample(user_ids, k=random.randint(5, 20))
        for t_id in targets:
            if u_id == t_id: continue
            follows_data.append({"follower_id": u_id, "followed_id": t_id})
            
    # Bulk insert
    session.bulk_insert_mappings(Follow, follows_data)
    session.commit()
    
    # Update counts (simplified)
    # Ideally should run a count query and update, but for seeding 500 users, iterating is okay-ish or just skip
    # Let's run a quick update
    print("Updating Follow Counts...")
    for u in all_users:
        u.followers_count = session.query(Follow).filter_by(followed_id=u.id).count()
        u.following_count = session.query(Follow).filter_by(follower_id=u.id).count()
    session.commit()
    print("Follows seeded.")

def seed_posts():
    print(f"Seeding {NUM_POSTS} Posts...")
    all_users = session.query(User).all()
    
    posts = []
    for i in range(NUM_POSTS):
        user = random.choice(all_users)
        is_project = random.random() < 0.3 # 30% are projects
        
        post = Post(
            author_id=user.id,
            title=fake.catch_phrase(),
            slug=fake.slug() + f"-{str(uuid.uuid4())[:8]}",
            content_body=generate_post_content(),
            type='project' if is_project else random.choice(['post', 'question', 'thought']),
            visibility='public',
            category=random.choice(get_tech_skills()),
            likes_count=random.randint(0, 100),
            comments_count=0, # Will update
            views_count=random.randint(100, 5000),
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(0, 60))
        )
        posts.append(post)
        
        if len(posts) >= 100:
            session.add_all(posts)
            session.commit()
            posts = []
            
    if posts:
        session.add_all(posts)
        session.commit()
    print("Posts seeded.")

def seed_projects():
    print(f"Seeding {NUM_PROJECTS} Projects...")
    # Find posts of type 'project'
    project_posts = session.query(Post).filter_by(type='project').all()
    
    projects = []
    for post in project_posts:
        proj = Project(
            post_id=post.id,
            owner_id=post.author_id,
            status=random.choice(['idea', 'in_progress', 'recruiting', 'completed']),
            repository_url=f"https://github.com/{fake.user_name()}/{fake.slug()}",
            difficulty_level=random.choice(['Beginner', 'Intermediate', 'Advanced']),
            estimated_duration=random.choice(['1 week', '1 month', '3 months']),
            team_size_current=random.randint(1, 3),
            team_size_max=random.randint(3, 6),
            is_open_source=True,
            start_date=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(10, 100))
        )
        projects.append(proj)
        
    session.add_all(projects)
    session.commit()
    print("Projects seeded.")

def seed_comments():
    print(f"Seeding {NUM_COMMENTS} Comments...")
    all_users = session.query(User).all()
    all_posts = session.query(Post).all()
    
    comments = []
    for i in range(NUM_COMMENTS):
        post = random.choice(all_posts)
        user = random.choice(all_users)
        
        comment = Comment(
            post_id=post.id,
            user_id=user.id,
            content=fake.sentence(),
            likes_count=random.randint(0, 20),
            created_at=datetime.datetime.utcnow()
        )
        comments.append(comment)
        
        # Determine strict update for post comments_count
        post.comments_count += 1
    
    session.add_all(comments)
    session.commit()
    print("Comments seeded.")

def seed_app_settings():
    print("Seeding AppSettings...")
    all_users = session.query(User).all()
    settings = []
    for u in all_users:
        s = AppSettings(
            user_id=u.id,
            theme='system',
            language='en',
            push_notifications=True
        )
        settings.append(s)
    session.add_all(settings)
    session.commit()
    print("App Settings seeded.")

def seed_misc():
    print("Seeding Misc (Notifications, Insights)...")
    all_users = session.query(User).all()
    
    # Daily Insights
    insights = []
    for u in all_users:
        di = DailyInsight(
            user_id=u.id,
            views=random.randint(0, 50),
            impressions=random.randint(0, 200),
            new_follows=random.randint(0, 5)
        )
        insights.append(di)
    session.add_all(insights)
    
    # Notifications
    notes = []
    for i in range(NUM_NOTIFICATIONS):
        u = random.choice(all_users)
        sender = random.choice(all_users)
        note = Notification(
            recipient_id=u.id,
            sender_id=sender.id,
            type=random.choice(['like', 'comment', 'follow']),
            title="Notification",
            body=fake.sentence(),
            is_read=random.choice([True, False])
        )
        notes.append(note)
    session.add_all(notes)
    
    session.commit()
    print("Misc seeded.")

def main():
    print("Starting Seeding V6 (Final)...")
    init_db() # Ensure tables exist
    
    seed_skills()
    seed_users()
    seed_app_settings()
    seed_user_skills()
    seed_follows()
    seed_posts()
    seed_projects()
    seed_comments()
    seed_misc()
    
    print("Seeding Complete!")

if __name__ == "__main__":
    main()
