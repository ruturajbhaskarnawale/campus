import sys
import os
import random
import json
import datetime
import bcrypt
from datetime import timedelta

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from lib.db.database import db_session, engine, Base
from lib.db.models import (
    User, Post, Project, Comment, Notification, Follow, Skill, 
    Conversation, Message, AppSettings, SearchHistory, Report, 
    PostLike, SavedPost, user_skills, conversation_participants
)
from sqlalchemy import text

def clean_database():
    print("--- Phase 2: Data Cleanup ---")
    session = db_session
    try:
        # Disable foreign keys for SQLite to clear tables easily
        session.execute(text("PRAGMA foreign_keys = OFF"))
        
        tables = [
            "reports", "search_history", "app_settings", "messages", 
            "conversation_participants", "conversations", "notifications", 
            "comments", "saved_posts", "post_likes", "projects", "posts", 
            "user_skills", "follows", "skills", "users"
        ]
        
        for table in tables:
            print(f"Clearing table: {table}")
            session.execute(text(f"DELETE FROM {table}"))
            # Reset auto-increment
            session.execute(text(f"DELETE FROM sqlite_sequence WHERE name='{table}'"))
            
        session.commit()
        session.execute(text("PRAGMA foreign_keys = ON"))
        print("Cleanup complete.\n")
    except Exception as e:
        print(f"Error during cleanup: {e}")
        session.rollback()
        raise

def seed_database():
    print("--- Phase 3: Data Seeding ---")
    session = db_session
    
    # Common Password
    password = "password123"
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # 1. Users
    print("Seeding Users...")
    users_data = [
        {
            "uid": "uid_arjun", "username": "arjun_codes", "email": "arjun@iitd.ac.in", 
            "full_name": "Arjun Sharma", "role": "Student",
            "bio": "Full Stack Developer | CS Undergrad at IIT Delhi. Loves Python and React.",
            "university": "IIT Delhi", "department": "Computer Science", 
            "location": "New Delhi, India", "avatar_url": "https://i.pravatar.cc/150?img=11",
            "graduation_year": 2025
        },
        {
            "uid": "uid_priya", "username": "priya_ai", "email": "priya@iitb.ac.in", 
            "full_name": "Priya Patel", "role": "Student",
            "bio": "AI/ML Enthusiast. researching on NLP. Student at IIT Bombay.",
            "university": "IIT Bombay", "department": "Computer Science", 
            "location": "Mumbai, India", "avatar_url": "https://i.pravatar.cc/150?img=5",
            "graduation_year": 2026
        },
        {
            "uid": "uid_rohan", "username": "rohan_dev", "email": "rohan@bits.ac.in", 
            "full_name": "Rohan Gupta", "role": "Student",
            "bio": "Competitive Programmer | C++ | Backend Developer.",
            "university": "BITS Pilani", "department": "Computer Science", 
            "location": "Pilani, India", "avatar_url": "https://i.pravatar.cc/150?img=13",
            "graduation_year": 2024
        },
        {
            "uid": "uid_sneha", "username": "sneha_cloud", "email": "sneha@iiith.ac.in", 
            "full_name": "Sneha Reddy", "role": "Student",
            "bio": "Cloud Native | DevOps | AWS Community Builder.",
            "university": "IIIT Hyderabad", "department": "Computer Science", 
            "location": "Hyderabad, India", "avatar_url": "https://i.pravatar.cc/150?img=9",
            "graduation_year": 2025
        },
        {
            "uid": "uid_vikram", "username": "vikram_tech", "email": "vikram@alumni.iitm.ac.in", 
            "full_name": "Vikram Singh", "role": "Alumni",
            "bio": "SDE-2 at Google | Mentoring students | Ex-IIT Madras.",
            "university": "IIT Madras", "department": "Computer Science", 
            "location": "Bangalore, India", "avatar_url": "https://i.pravatar.cc/150?img=3",
            "graduation_year": 2022
        }
    ]
    
    users = []
    for u in users_data:
        user = User(
            uid=u['uid'],
            username=u['username'],
            email=u['email'],
            full_name=u['full_name'],
            password_hash=hashed_pw,
            role=u['role'],
            bio=u['bio'],
            university=u['university'],
            department=u['department'],
            location=u['location'],
            avatar_url=u['avatar_url'],
            graduation_year=u['graduation_year'],
            is_verified=True,
            is_online=True,
            account_status='active',
            xp_points=random.randint(100, 1000),
            created_at=datetime.datetime.utcnow()
        )
        session.add(user)
        users.append(user)
    session.commit() # Commit to get IDs
    
    # 2. Skills
    print("Seeding Skills...")
    skills_list = ["Python", "React", "Machine Learning", "Node.js", "AWS"]
    skills = []
    for s_name in skills_list:
        skill = Skill(name=s_name, category="Tech", popularity_count=random.randint(10, 100))
        session.add(skill)
        skills.append(skill)
    session.commit()
    
    # 3. User Skills (Junction)
    print("Seeding User Skills...")
    # Assign some skills to users
    stmt = user_skills.insert().values([
        {"user_id": users[0].id, "skill_id": skills[0].id, "level": "Expert"}, # Arjun - Python
        {"user_id": users[0].id, "skill_id": skills[1].id, "level": "Intermediate"}, # Arjun - React
        {"user_id": users[1].id, "skill_id": skills[2].id, "level": "Expert"}, # Priya - ML
        {"user_id": users[2].id, "skill_id": skills[0].id, "level": "Advanced"}, # Rohan - Python
        {"user_id": users[3].id, "skill_id": skills[4].id, "level": "Advanced"}, # Sneha - AWS
    ])
    session.execute(stmt)
    session.commit()
    
    # 4. Posts
    print("Seeding Posts...")
    posts_data = [
        {
            "author": users[0], # Arjun
            "title": "Looking for teammates for Smart India Hackathon 2025",
            "content": "Hey everyone, I'm building a team for SIH 2025. We plan to work on the 'Smart Education' theme using React and Django. Looking for a frontend dev and a UI designer. Let me know if interested!",
            "type": "project",
            "category": "Hackathon",
            "media": [ "https://images.unsplash.com/photo-1504384308090-c54be3855833?auto=format&fit=crop&w=800&q=80" ]
        },
        {
            "author": users[1], # Priya
            "title": "Understanding Transformers in NLP - A Quick Guide",
            "content": "Just published a small blog on how Attention mechanism works. Here is a visual representation of the encoder-decoder architecture. #NLP #AI #DeepLearning",
            "type": "thought",
            "category": "AI/ML",
            "media": [ "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80" ]
        },
        {
            "author": users[2], # Rohan
            "title": "Best resources to learn System Design?",
            "content": "I'm preparing for placements and finding System Design a bit tricky. What resources do you guys recommend? books, channels?",
            "type": "question",
            "category": "Career",
            "media": []
        },
        {
            "author": users[3], # Sneha
            "title": "deployed my first Kubernetes cluster!",
            "content": "Finally managed to set up a K8s cluster on AWS using EKS. The learning curve was steep but totally worth it. Check out the architecture diagram.",
            "type": "post",
            "category": "Cloud",
            "media": [ "https://images.unsplash.com/photo-1667372393119-c81c0026dfba?auto=format&fit=crop&w=800&q=80" ]
        },
        {
            "author": users[4], # Vikram
            "title": "Campus Placement Tips for 2025 Batch",
            "content": "Since placement season is approaching, here are top 5 tips from my experience interviewing candidates at Google. 1. DSA is key. 2. Know your projects inside out...",
            "type": "post",
            "category": "Career",
            "media": [ "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80" ]
        }
    ]
    
    posts = []
    for p in posts_data:
        post = Post(
            author_id=p['author'].id,
            title=p['title'],
            content_body=p['content'],
            type=p['type'],
            category=p['category'],
            media_urls_json=p['media'],
            likes_count=random.randint(5, 50),
            comments_count=random.randint(1, 10),
            created_at=datetime.datetime.utcnow()
        )
        session.add(post)
        posts.append(post)
    session.commit()
    
    # 5. Projects
    print("Seeding Projects...")
    # Based on Arjun's post (posts[0])
    project1 = Project(
        post_id=posts[0].id,
        owner_id=users[0].id,
        status="recruiting",
        repository_url="https://github.com/arjun_codes/sih-2025-edutech",
        difficulty_level="Intermediate",
        estimated_duration="2 months",
        start_date=datetime.datetime.utcnow(),
        is_open_source=True,
        skills_required_json=["React", "Django"],
        looking_for_roles_json=["Frontend Developer", "Designer"]
    )
    # New dummy projects to fill count to 5
    project2 = Project(post_id=posts[3].id, owner_id=users[3].id, status="completed", difficulty_level="Advanced", repository_url="https://github.com/sneha/k8s-demo")
    project3 = Project(post_id=posts[1].id, owner_id=users[1].id, status="in_progress", difficulty_level="Advanced", repository_url="https://github.com/priya/nlp-research")
    project4 = Project(owner_id=users[2].id, status="idea", difficulty_level="Beginner", repository_url="https://github.com/rohan/algo-visualizer") # Standalone project? Needs post_id usually but schema allows null? No, FK usually enforces. Wait, checking schema... post_id is FK. So I need more posts if I want 5 projects linked?
    # Actually, the requirement says "Seed exactly 5 records in each of the 16 tables".
    # So I need 5 projects. They need valid post_ids. 
    # Can multiple projects link to same post? One-to-One usually ("uselist=False" in Post model).
    # So I need 5 posts that are "Project" type ideally, or just link them to existing posts.
    # But I only have 5 posts total.
    # So I will link each project to one post.
    # Wait, Post-Project relationship: Post has `project = relationship("Project", uselist=False...)`. So 1-to-1.
    # So to have 5 Projects, I need 5 Posts that act as projects.
    # But my posts are mixed types.
    # However, strictly speaking, a Project record *can* exist for any post if I force it, but logically it implies the post is about a project.
    # I will create 5 projects linked to the 5 posts I created. Even if the post is "Question", maybe the project is the code for it? 
    # Or to be cleaner, I should have made all 5 posts somewhat project related or just accept strict data linkage.
    # I will link project 1-5 to post 1-5.
    
    projects = []
    projects.append(project1)
    projects.append(project2)
    projects.append(project3)
    projects.append(Project(post_id=posts[2].id, owner_id=users[2].id, status="idea", repository_url="https://github.com/rohan/sys-design-notes"))
    projects.append(Project(post_id=posts[4].id, owner_id=users[4].id, status="idea", repository_url="https://github.com/vikram/interview-prep"))
    
    for proj in projects:
        session.add(proj)
    session.commit()
    
    # 6. Post Likes
    print("Seeding Likes...")
    likes = [
        PostLike(user_id=users[1].id, post_id=posts[0].id), # Priya likes Arjun's
        PostLike(user_id=users[2].id, post_id=posts[0].id), # Rohan likes Arjun's
        PostLike(user_id=users[0].id, post_id=posts[1].id), # Arjun likes Priya's
        PostLike(user_id=users[3].id, post_id=posts[1].id), # Sneha likes Priya's
        PostLike(user_id=users[4].id, post_id=posts[3].id), # Vikram likes Sneha's
    ]
    for l in likes: session.add(l)
    session.commit()
    
    # 7. Saved Posts
    print("Seeding Saved Posts...")
    saves = [
        SavedPost(user_id=users[0].id, post_id=posts[2].id, note="Read regarding system design"),
        SavedPost(user_id=users[1].id, post_id=posts[4].id, note="Interview tips"),
        SavedPost(user_id=users[2].id, post_id=posts[3].id, note="K8s reference"),
        SavedPost(user_id=users[3].id, post_id=posts[1].id, note="NLP basics"),
        SavedPost(user_id=users[4].id, post_id=posts[0].id, note="Interesting project"),
    ]
    for s in saves: session.add(s)
    session.commit()
    
    # 8. Comments
    print("Seeding Comments...")
    comments = [
        Comment(post_id=posts[0].id, user_id=users[1].id, content="I'm interested! Sent you a DM."),
        Comment(post_id=posts[0].id, user_id=users[2].id, content="What is the deadline?"),
        Comment(post_id=posts[1].id, user_id=users[0].id, content="Great visualization, thanks!"),
        Comment(post_id=posts[2].id, user_id=users[4].id, content="Check out 'Designing Data-Intensive Applications' by Kleppmann."),
        Comment(post_id=posts[3].id, user_id=users[0].id, content="EKS is powerful. Good job!"),
    ]
    for c in comments: session.add(c)
    session.commit()
    
    # 9. Conversations
    print("Seeding Conversations...")
    convs = [
        Conversation(name="Arjun & Priya", type="direct"),
        Conversation(name="Project Team", type="group"),
        Conversation(name="Rohan & Sneha", type="direct"),
        Conversation(name="Alumni Mentorship", type="group"),
        Conversation(name="Study Group", type="group"),
    ]
    for cv in convs: session.add(cv)
    session.commit()
    
    # 10. Conversation Participants
    print("Seeding Conversation Participants...")
    stmt2 = conversation_participants.insert().values([
        {"conversation_id": convs[0].id, "user_id": users[0].id, "role": "member"}, # Arjun
        {"conversation_id": convs[0].id, "user_id": users[1].id, "role": "member"}, # Priya
        {"conversation_id": convs[1].id, "user_id": users[0].id, "role": "admin"}, # Arjun
        {"conversation_id": convs[2].id, "user_id": users[2].id, "role": "member"}, # Rohan
        {"conversation_id": convs[2].id, "user_id": users[3].id, "role": "member"}, # Sneha
    ])
    session.execute(stmt2)
    session.commit()
    
    # 11. Messages
    print("Seeding Messages...")
    msgs = [
        Message(conversation_id=convs[0].id, sender_id=users[1].id, content="Hey Arjun, regarding the hackathon..."),
        Message(conversation_id=convs[0].id, sender_id=users[0].id, content="Yes Priya?"),
        Message(conversation_id=convs[1].id, sender_id=users[0].id, content="Welcome to the team everyone!"),
        Message(conversation_id=convs[2].id, sender_id=users[2].id, content="Did you check the AWS update?"),
        Message(conversation_id=convs[3].id, sender_id=users[4].id, content="Feel free to ask any career questions."),
    ]
    for m in msgs: session.add(m)
    session.commit()
    
    # 12. Notifications
    print("Seeding Notifications...")
    notifs = [
        Notification(recipient_id=users[0].id, sender_id=users[1].id, type="like", title="New Like", body="Priya liked your post"),
        Notification(recipient_id=users[0].id, sender_id=users[2].id, type="comment", title="New Comment", body="Rohan commented on your post"),
        Notification(recipient_id=users[1].id, sender_id=users[0].id, type="follow", title="New Follower", body="Arjun started following you"),
        Notification(recipient_id=users[2].id, sender_id=users[4].id, type="mention", title="Mention", body="Vikram mentioned you in a comment"),
        Notification(recipient_id=users[3].id, sender_id=users[2].id, type="message", title="New Message", body="Rohan sent you a message"),
    ]
    for n in notifs: session.add(n)
    session.commit()
    
    # 13. Follows
    print("Seeding Follows...")
    follows = [
        Follow(follower_id=users[0].id, followed_id=users[1].id), # Arjun -> Priya
        Follow(follower_id=users[1].id, followed_id=users[0].id), # Priya -> Arjun
        Follow(follower_id=users[2].id, followed_id=users[3].id), # Rohan -> Sneha
        Follow(follower_id=users[3].id, followed_id=users[4].id), # Sneha -> Vikram
        Follow(follower_id=users[4].id, followed_id=users[0].id), # Vikram -> Arjun
    ]
    for f in follows: session.add(f)
    session.commit()
    
    # 14. App Settings
    print("Seeding App Settings...")
    settings = []
    for u in users:
        settings.append(AppSettings(user_id=u.id, theme="dark" if u.id % 2 == 0 else "light"))
    for s in settings: session.add(s)
    session.commit()
    
    # 15. Search History
    print("Seeding Search History...")
    searches = [
        SearchHistory(user_id=users[0].id, query_text="React tutorials"),
        SearchHistory(user_id=users[1].id, query_text="Transformers NLP"),
        SearchHistory(user_id=users[2].id, query_text="System Design"),
        SearchHistory(user_id=users[3].id, query_text="AWS EKS"),
        SearchHistory(user_id=users[4].id, query_text="Placement trends"),
    ]
    for sh in searches: session.add(sh)
    session.commit()
    
    # 16. Reports
    print("Seeding Reports...")
    reports = [
        Report(reporter_id=users[0].id, target_id=posts[1].id, target_type="post", reason="Spam"),
        Report(reporter_id=users[1].id, target_id=users[2].id, target_type="user", reason="Harassment"),
        Report(reporter_id=users[2].id, target_id=comments[0].id, target_type="comment", reason="Inappropriate"),
        Report(reporter_id=users[3].id, target_id=posts[0].id, target_type="post", reason="Misinformation"),
        Report(reporter_id=users[4].id, target_id=users[1].id, target_type="user", reason="Bot"),
    ]
    for r in reports: session.add(r)
    session.commit()
    
    print("Seeding Complete.\n")

def validate_database():
    print("--- Phase 4: Validation ---")
    session = db_session
    tables = [
        User, Post, Project, Comment, Notification, Follow, Skill, 
        Conversation, Message, AppSettings, SearchHistory, Report, 
        PostLike, SavedPost
    ]
    # Check regular tables
    for model in tables:
        count = session.query(model).count()
        print(f"Table {model.__tablename__}: {count} records")
        if count != 5:
            print(f"WARNING: {model.__tablename__} has {count} records, expected 5.")
    
    # Check junction tables manually
    conn = engine.connect()
    
    res = conn.execute(text("SELECT count(*) FROM user_skills")).scalar()
    print(f"Table user_skills: {res} records")
    if res != 5:
         print(f"WARNING: user_skills has {res} records, expected 5.")

    res = conn.execute(text("SELECT count(*) FROM conversation_participants")).scalar()
    print(f"Table conversation_participants: {res} records")
    if res != 5:
         print(f"WARNING: conversation_participants has {res} records, expected 5.")

    print("Validation passed if all counts are 5.")

if __name__ == "__main__":
    clean_database()
    seed_database()
    validate_database()
