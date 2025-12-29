from lib.db.database import init_db, db_session, engine
from lib.db.models import User, Post, Comment, Notification, Follow, Conversation, Message, AppSettings
from werkzeug.security import generate_password_hash
import datetime
import random

def seed_data():
    print(">> Seeding Data...")
    session = db_session
    
    # 1. Clear Data
    print("   Clearing existing data...")
    meta = User.metadata
    for table in reversed(meta.sorted_tables):
        session.execute(table.delete())
    session.commit()
    
    # 2. Create Users
    print("   Creating Users...")
    users = []
    
    # User 1: Current User (The one usually logged in for demo)
    me = User(
        uid="user_123", # Fixed UID for easy login
        username="alex_dev",
        email="alex@campus.edu",
        password_hash=generate_password_hash("password"),
        full_name="Alex Designer",
        bio="Creative Developer & UI/UX Enthusiast. Building things that matter.",
        avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        cover_photo_url="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80",
        role="Student",
        university="Stanford University",
        xp_points=1250,
        level=5
    )
    users.append(me)

    # Other Realistic Users
    profiles = [
        {
            "uid": "u_sarah",
            "name": "Sarah Chen",
            "email": "sarah@campus.edu",
            "bio": "AI Researcher | Python | Pytorch. Looking for collaborators on NLP projects.",
            "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
            "role": "Student"
        },
        {
            "uid": "u_mike",
            "name": "Mike Ross",
            "email": "mike@campus.edu",
            "bio": "Full Stack Dev. React Native & Node.js expert.",
            "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
            "role": "Alumni"
        },
        {
            "uid": "u_emily",
            "name": "Emily Watson",
            "email": "emily@campus.edu",
            "bio": "Product Manager @ TechCorp. Mentoring students.",
            "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
            "role": "Professor"
        },
        {
            "uid": "u_david",
            "name": "David Kim",
            "email": "david@campus.edu",
            "bio": "Hackathon Addict. Blockchain & Web3.",
            "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
            "role": "Student"
        }
    ]
    
    for p in profiles:
        u = User(
            uid=p['uid'],
            username=p['email'].split('@')[0],
            email=p['email'],
            password_hash=generate_password_hash("password"),
            full_name=p['name'],
            bio=p['bio'],
            avatar_url=p['avatar'],
            role=p['role'],
            university="MIT" if random.choice([True, False]) else "Berkeley",
            xp_points=random.randint(100, 2000)
        )
        users.append(u)
        
    session.add_all(users)
    session.commit()
    
    # Re-fetch users to get IDs
    all_users = session.query(User).all()
    user_map = {u.uid: u for u in all_users}
    me_user = user_map['user_123']
    others = [u for u in all_users if u.id != me_user.id]
    
    # 3. Create Posts
    print("   Creating Posts...")
    posts = []
    
    post_contents = [
        {"title": "Launched my new Portfolio!", "body": "Just deployed my personal site using Next.js and Tailwind. Check it out! Feedback welcome.", "type": "post"},
        {"title": "Looking for team members", "body": "Building a decentralized voting app. Need a smart contract dev and a frontend wizard.", "type": "project"},
        {"title": "Thoughts on AI Ethics", "body": "The rapid advancement of LLMs raises serious questions about bias and alignment. Here are my thoughts...", "type": "thought"},
        {"title": "Campus Hackathon 2025", "body": "Who's going to the hackathon next month? Let's form a team!", "type": "event"}
    ]
    
    for u in all_users:
        # Each user creates 1-2 posts
        for _ in range(random.randint(1, 2)):
            content = random.choice(post_contents)
            p = Post(
                author_id=u.id,
                title=content['title'],
                content_body=content['body'],
                type=content['type'],
                likes_count=random.randint(0, 50),
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(0, 10))
            )
            posts.append(p)
            
    session.add_all(posts)
    session.commit()
    
    # 4. Create Follows (Social Graph)
    print("   Creating Connections...")
    # Me follows some, some follow Me
    for o in others:
        # Me -> Other
        if random.choice([True, False]):
            f = Follow(follower_id=me_user.id, followed_id=o.id)
            session.add(f)
            me_user.following_count = (me_user.following_count or 0) + 1
            o.followers_count = (o.followers_count or 0) + 1
            
            # Notif
            n = Notification(
                recipient_id=o.id,
                sender_id=me_user.id,
                type='follow',
                title='New Follower',
                body=f"{me_user.full_name} followed you.",
                created_at=datetime.datetime.utcnow()
            )
            session.add(n)
            
        # Other -> Me
        if random.choice([True, False]):
            f = Follow(follower_id=o.id, followed_id=me_user.id)
            session.add(f)
            o.following_count = (o.following_count or 0) + 1
            me_user.followers_count = (me_user.followers_count or 0) + 1
            
            # Notif
            n = Notification(
                recipient_id=me_user.id,
                sender_id=o.id,
                type='follow',
                title='New Follower',
                body=f"{o.full_name} followed you.",
                created_at=datetime.datetime.utcnow()
            )
            session.add(n)
            
    session.commit()
    
    # 5. Create Messages
    print("   Creating Messages...")
    # Chat with Sarah
    sarah = user_map.get('u_sarah')
    if sarah:
        convo = Conversation(type='direct', created_at=datetime.datetime.utcnow())
        convo.participants = [me_user, sarah]
        session.add(convo)
        session.flush()
        
        msgs = [
            (sarah, "Hey Alex, saw your portfolio. Looks great!"),
            (me_user, "Thanks Sarah! Appreciate it."),
            (sarah, "are you free to catch up later?"),
            (me_user, "Sure, let's meet at the cafe.")
        ]
        
        for sender, txt in msgs:
            m = Message(
                conversation_id=convo.id,
                sender_id=sender.id,
                content=txt,
                created_at=datetime.datetime.utcnow()
            )
            session.add(m)
            convo.last_message_preview = txt
            convo.last_message_at = datetime.datetime.utcnow()
            
    # Chat with Mike (Group maybe?)
    mike = user_map.get('u_mike')
    if mike:
         convo2 = Conversation(type='direct', created_at=datetime.datetime.utcnow())
         convo2.participants = [me_user, mike]
         session.add(convo2)
         session.flush()
         
         m = Message(
             conversation_id=convo2.id,
             sender_id=mike.id,
             content="Bro, check this repo out.",
             created_at=datetime.datetime.utcnow()
         )
         session.add(m)
         convo2.last_message_preview = "Bro, check this repo out."
         convo2.last_message_at = datetime.datetime.utcnow()
         
         # Unread notif for me
         n = Notification(
             recipient_id=me_user.id,
             sender_id=mike.id,
             type='message',
             title=f"New Message from {mike.full_name}",
             body="Bro, check this repo out.",
             reference_id=convo2.id,
             reference_type='conversation',
             created_at=datetime.datetime.utcnow()
         )
         session.add(n)
         
    session.commit()
    print(">> Data Seeded Successfully!")

if __name__ == "__main__":
    seed_data()
