from datetime import datetime
import json
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, 
    JSON, Float, Table
)
from sqlalchemy.orm import relationship
from .database import Base

# --- Junction Tables ---

user_skills = Table('user_skills', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('skill_id', Integer, ForeignKey('skills.id')),
    Column('level', String(50), default='Beginner'),
    Column('endorsements_count', Integer, default=0),
    Column('is_primary', Boolean, default=False),
    Column('verified_by_json', JSON, default=list),
    Column('added_at', DateTime, default=datetime.utcnow)
)

conversation_participants = Table('conversation_participants', Base.metadata,
    Column('conversation_id', Integer, ForeignKey('conversations.id')),
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('role', String(50), default='member'),
    Column('joined_at', DateTime, default=datetime.utcnow),
    Column('nickname', String(100))
)

# --- Core Models ---

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String(100), unique=True, index=True) # Legacy/Auth Integration
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    password_hash = Column(String(255)) # Storing hashed password
    
    full_name = Column(String(100))
    avatar_url = Column(Text)
    cover_photo_url = Column(Text)
    bio = Column(Text)
    role = Column(String(50), default='Student') # Student, Professor, Alumni
    
    # Metadata
    is_verified = Column(Boolean, default=False)
    is_online = Column(Boolean, default=False)
    last_active_at = Column(DateTime)
    
    # Education / Professional
    university = Column(String(255))
    department = Column(String(100))
    graduation_year = Column(Integer)
    student_id = Column(String(50))
    location = Column(String(100))
    
    # Social Links
    website_url = Column(Text)
    github_url = Column(Text)
    linkedin_url = Column(Text)
    twitter_url = Column(Text)
    
    # System
    fcm_token = Column(Text)
    xp_points = Column(Integer, default=0)
    level = Column(Integer, default=1)
    current_streak = Column(Integer, default=0)
    account_status = Column(String(50), default='active') 
    
    # Social Stats
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    posts = relationship("Post", back_populates="author")
    skills = relationship("Skill", secondary=user_skills, back_populates="users")
    conversations = relationship("Conversation", secondary=conversation_participants, back_populates="participants")

class Post(Base):
    __tablename__ = 'posts'

    id = Column(Integer, primary_key=True)
    author_id = Column(Integer, ForeignKey('users.id'))
    
    title = Column(String(255))
    slug = Column(String(255), unique=True)
    content_body = Column(Text) # Markdown
    type = Column(String(50), default='post') # project, thought, question
    visibility = Column(String(50), default='public')
    
    media_urls_json = Column(JSON) # ["url1", "url2"]
    poll_data_json = Column(JSON) # { "question": "...", "options": [...], "votes": {...} }
    category = Column(String(100))
    tags_json = Column(JSON)
    
    # Stats
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)
    views_count = Column(Integer, default=0)
    saves_count = Column(Integer, default=0)
    
    # Configurations
    is_featured = Column(Boolean, default=False)
    allow_comments = Column(Boolean, default=True)
    metadata_json = Column(JSON)
    location_tag = Column(String(100))
    sentiment_score = Column(Float)
    reports_count = Column(Integer, default=0)
    
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    author = relationship("User", back_populates="posts")
    project = relationship("Project", uselist=False, back_populates="post")
    comments = relationship("Comment", back_populates="post")

class Project(Base):
    __tablename__ = 'projects'

    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey('posts.id'))
    owner_id = Column(Integer, ForeignKey('users.id'))
    
    status = Column(String(50), default='idea') # idea, recruiting, in_progress, completed
    repository_url = Column(Text)
    demo_url = Column(Text)
    
    difficulty_level = Column(String(50))
    estimated_duration = Column(String(50))
    
    team_size_current = Column(Integer, default=1)
    team_size_max = Column(Integer, default=2)
    
    skills_required_json = Column(JSON)
    looking_for_roles_json = Column(JSON)
    
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    
    is_open_source = Column(Boolean, default=True)
    license = Column(String(50), default='MIT')
    tools_used_json = Column(JSON)
    documentation_url = Column(Text)
    
    join_requests_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="project")
    # Extended: Project Members can be a separate table or managed via looking_for_roles

class Comment(Base):
    __tablename__ = 'comments'

    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey('posts.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    parent_id = Column(Integer, ForeignKey('comments.id'), nullable=True)
    
    content = Column(Text)
    media_url = Column(Text)
    
    likes_count = Column(Integer, default=0)
    is_pinned = Column(Boolean, default=False)
    is_edited = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    
    mentioned_users_json = Column(JSON)
    sentiment_score = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    post = relationship("Post", back_populates="comments")
    author = relationship("User")
    replies = relationship("Comment", 
        back_populates="parent",
        cascade="all, delete-orphan"
    )
    
    parent = relationship("Comment", 
        back_populates="replies", 
        remote_side=[id] # This id defaults to the class attribute id
    )

class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(Integer, primary_key=True)
    recipient_id = Column(Integer, ForeignKey('users.id'))
    sender_id = Column(Integer, ForeignKey('users.id'))
    
    type = Column(String(50)) # like, comment, etc
    title = Column(String(255))
    body = Column(Text)
    
    reference_id = Column(Integer)
    reference_type = Column(String(50))
    
    is_read = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    
    action_url = Column(Text)
    priority = Column(String(20), default='normal')
    channel = Column(String(20), default='in_app')
    
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

class Follow(Base):
    __tablename__ = 'follows'
    
    follower_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    followed_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    
    status = Column(String(20), default='accepted')
    close_friend = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Skill(Base):
    __tablename__ = 'skills'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True)
    category = Column(String(50))
    icon_name = Column(String(50))
    popularity_count = Column(Integer, default=0)
    
    users = relationship("User", secondary=user_skills, back_populates="skills")

class Conversation(Base):
    __tablename__ = 'conversations'
    
    id = Column(Integer, primary_key=True)
    type = Column(String(20), default='direct') 
    name = Column(String(100))
    last_message_preview = Column(Text)
    last_message_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    participants = relationship("User", secondary=conversation_participants, back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")

class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id'))
    sender_id = Column(Integer, ForeignKey('users.id'))
    
    content = Column(Text)
    type = Column(String(20), default='text')
    attachment_url = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")

class AppSettings(Base):
    __tablename__ = 'app_settings'
    
    user_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    theme = Column(String(20), default='system')
    language = Column(String(10), default='en')
    push_notifications = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow)

class SearchHistory(Base):
    __tablename__ = 'search_history'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    query_text = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

class Report(Base):
    __tablename__ = 'reports'
    
    id = Column(Integer, primary_key=True)
    reporter_id = Column(Integer, ForeignKey('users.id'))
    target_id = Column(Integer)
    target_type = Column(String(50))
    reason = Column(String(100))
    status = Column(String(20), default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)

class PostLike(Base):
    __tablename__ = 'post_likes'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    post_id = Column(Integer, ForeignKey('posts.id'))
    reaction_type = Column(String(20), default='like') # like, celebrate, support, insightful
    created_at = Column(DateTime, default=datetime.utcnow)

class SavedPost(Base):
    __tablename__ = 'saved_posts'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    post_id = Column(Integer, ForeignKey('posts.id'))
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    post = relationship("Post")
