"""
Enhanced Search Module with Advanced Features
- Multi-source search (users, projects, posts)
- AI-powered match scoring  
- Real-time suggestions
- Trending searches
- Advanced filtering
"""

from flask import Blueprint, request, jsonify
from lib.core.utils.firebase_config import get_db
from lib.core.utils.cache_helper import cached
from firebase_admin import firestore
import datetime
from collections import Counter
import re

search_bp = Blueprint('search', __name__)

def calculate_match_score(user_skills, required_skills):
    """
    Calculate match percentage between user skills and requirements
    Uses Jaccard similarity coefficient
    """
    if not user_skills or not required_skills:
        return 0
    
    user_set = set([s.lower().strip() for s in user_skills])
    required_set = set([s.lower().strip() for s in required_skills])
    
    if not required_set:
        return 0
    
    intersection = len(user_set.intersection(required_set))
    union = len(user_set.union(required_set))
    
    if union == 0:
        return 0
    
    jaccard_score = (intersection / union) * 100
    
    # Boost score if user has all required skills
    if required_set.issubset(user_set):
        jaccard_score = min(jaccard_score + 20, 100)
    
    return round(jaccard_score, 1)


@search_bp.route('/unified', methods=['GET'])
def unified_search():
    """
    Unified search across users, projects, and posts
    Supports: query, filters, sorting, pagination
    """
    try:
        query = request.args.get('q', '').lower().strip()
        search_type = request.args.get('type', 'all')  # all, users, projects, posts
        skills_filter = request.args.getlist('skills')
        availability_filter = request.args.get('availability')
        sort_by = request.args.get('sort', 'relevance')  # relevance, recent, popular
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        if not query and not skills_filter:
            # Allow empty query if we just want to list items (browse mode)
            pass
        
        db = get_db()
        results = {
            'users': [],
            'projects': [],
            'posts': [],
            'total': 0,
            'query': query,
            'searchTime': 0
        }
        
        start_time = datetime.datetime.now()
        
        # Search Users
        if search_type in ['all', 'users']:
            users_results = search_users(db, query, skills_filter, availability_filter, limit)
            results['users'] = users_results
        
        # Search Projects/Posts
        if search_type in ['all', 'projects', 'posts']:
            posts_results = search_posts(db, query, skills_filter, limit)
            if search_type == 'projects':
                results['projects'] = posts_results
            elif search_type == 'posts':
                results['posts'] = posts_results
            else:
                # Separate by type
                for post in posts_results:
                    if post.get('type') == 'project':
                        results['projects'].append(post)
                    else:
                        results['posts'].append(post)
        
        # Calculate total
        results['total'] = len(results['users']) + len(results['projects']) + len(results['posts'])
        
        # Calculate search time
        end_time = datetime.datetime.now()
        results['searchTime'] = round((end_time - start_time).total_seconds() * 1000, 1)  # ms
        
        # Save search analytics
        save_search_analytics(query, search_type, results['total'], skills_filter)
        
        return jsonify(results), 200
        
    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({"error": str(e)}), 500


def search_users(db, query, skills_filter, availability_filter, limit):
    """Search users by name, bio, and skills"""
    try:
        users_ref = db.collection('users').stream()
        matches = []
        
        for user_doc in users_ref:
            user_data = user_doc.to_dict()
            user_data['uid'] = user_doc.id
            score = 0
            
            # Match by name
            if query and query in user_data.get('name', '').lower():
                score += 50
            
            # Match by bio
            if query and query in user_data.get('bio', '').lower():
                score += 30
            
            # Match by skills
            user_skills = user_data.get('skills', [])
            if skills_filter:
                match_score = calculate_match_score(user_skills, skills_filter)
                score += match_score
                user_data['matchScore'] = match_score
            else:
                for skill in user_skills:
                    if query and query in skill.lower():
                        score += 20
                        break
            
            # Filter by availability
            if availability_filter:
                if user_data.get('availability') != availability_filter:
                    continue
            
            # Only include if score > 0 or has skills match or browsing (no query)
            if score > 0 or (skills_filter and user_skills) or (not query and not skills_filter):
                user_data['relevanceScore'] = score
                
                # Add additional info
                user_data['online'] = is_user_online(db, user_doc.id)
                user_data['followersCount'] = get_followers_count(db, user_doc.id)
                
                matches.append(user_data)
        
        # Sort by relevance score
        matches.sort(key=lambda x: x.get('relevanceScore', 0), reverse=True)
        
        return matches[:limit]
        
    except Exception as e:
        print(f"User search error: {e}")
        return []


def search_posts(db, query, skills_filter, limit):
    """Search posts/projects by title, description, and skills"""
    try:
        posts_ref = db.collection('posts').stream()
        matches = []
        
        for post_doc in posts_ref:
            post_data = post_doc.to_dict()
            post_data['id'] = post_doc.id
            score = 0
            
            # Match by title
            if query and query in post_data.get('title', '').lower():
                score += 50
            
            # Match by description
            if query and query in post_data.get('description', '').lower():
                score += 30
            
            # Match by skills needed
            skills_needed = post_data.get('skills_needed', [])
            if skills_filter:
                match_score = calculate_match_score(skills_filter, skills_needed)
                score += match_score
                post_data['matchScore'] = match_score
            else:
                for skill in skills_needed:
                    if query and query in skill.lower():
                        score += 20
                        break
            
            if score > 0:
                post_data['relevanceScore'] = score
                
                # Add author info
                author_uid = post_data.get('author_uid')
                if author_uid:
                    try:
                        author_doc = db.collection('users').document(author_uid).get()
                        if author_doc.exists:
                            author_data = author_doc.to_dict()
                            post_data['authorName'] = author_data.get('name', 'Unknown')
                            post_data['authorAvatar'] = author_data.get('avatar_url', '')
                    except:
                        pass
                
                matches.append(post_data)
        
        # Sort by relevance
        matches.sort(key=lambda x: x.get('relevanceScore', 0), reverse=True)
        
        return matches[:limit]
        
    except Exception as e:
        print(f"Post search error: {e}")
        return []


@search_bp.route('/suggestions', methods=['GET'])
@cached(timeout=300)  # Cache for 5 minutes
def get_suggestions():
    """Get autocomplete suggestions based on partial query"""
    try:
        partial = request.args.get('q', '').lower().strip()
        
        if len(partial) < 2:
            return jsonify({"suggestions": []}), 200
        
        db = get_db()
        suggestions = set()
        
        # Get skill suggestions
        users = db.collection('users').limit(100).stream()
        for user_doc in users:
            user_data = user_doc.to_dict()
            for skill in user_data.get('skills', []):
                if partial in skill.lower():
                    suggestions.add(skill)
        
        # Get name suggestions
        for user_doc in db.collection('users').limit(100).stream():
            name = user_doc.to_dict().get('name', '')
            if partial in name.lower():
                suggestions.add(name)
        
        # Get project title suggestions
        for post_doc in db.collection('posts').limit(50).stream():
            title = post_doc.to_dict().get('title', '')
            if partial in title.lower():
                suggestions.add(title)
        
        return jsonify({
            "suggestions": sorted(list(suggestions))[:10]
        }), 200
        
    except Exception as e:
        print(f"Suggestions error: {e}")
        return jsonify({"suggestions": []}), 200


@search_bp.route('/trending', methods=['GET'])
@cached(timeout=600)  # Cache for 10 minutes
def get_trending():
    """Get trending searches from last 24 hours"""
    try:
        db = get_db()
        
        # Get searches from last 24 hours
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        searches = db.collection('search_analytics')\
            .where(filter=firestore.FieldFilter('timestamp', '>=', yesterday))\
            .stream()
        
        # Count query frequencies
        query_counts = Counter()
        for search_doc in searches:
            search_data = search_doc.to_dict()
            query = search_data.get('query', '').strip()
            if query:
                query_counts[query] += 1
        
        # Get top 10
        trending = [
            {"query": query, "count": count}
            for query, count in query_counts.most_common(10)
        ]
        
        return jsonify({"trending": trending}), 200
        
    except Exception as e:
        print(f"Trending error: {e}")
        return jsonify({"trending": []}), 200


@search_bp.route('/save', methods=['POST'])
def save_search():
    """Save a search query for later or alerts"""
    try:
        data = request.json or {}
        user_id = data.get('userId')
        query = data.get('query')
        filters = data.get('filters', {})
        alert_enabled = data.get('alertEnabled', False)
        
        if not user_id or not query:
            return jsonify({"error": "User ID and query required"}), 400
        
        db = get_db()
        
        saved_search = {
            'userId': user_id,
            'query': query,
            'filters': filters,
            'alertEnabled': alert_enabled,
            'createdAt': datetime.datetime.now()
        }
        
        doc_ref = db.collection('saved_searches').document()
        doc_ref.set(saved_search)
        
        return jsonify({
            "message": "Search saved",
            "id": doc_ref.id
        }), 200
        
    except Exception as e:
        print(f"Save search error: {e}")
        return jsonify({"error": str(e)}), 500


@search_bp.route('/saved', methods=['GET'])
def get_saved_searches():
    """Get user's saved searches"""
    try:
        user_id = request.args.get('userId')
        
        if not user_id:
            return jsonify({"error": "User ID required"}), 400
        
        db = get_db()
        searches = db.collection('saved_searches')\
            .where(filter=firestore.FieldFilter('userId', '==', user_id))\
            .stream()
        
        saved = []
        for search_doc in searches:
            search_data = search_doc.to_dict()
            search_data['id'] = search_doc.id
            # Convert datetime to string if present
            if 'createdAt' in search_data and hasattr(search_data['createdAt'], 'isoformat'):
                search_data['createdAt'] = search_data['createdAt'].isoformat()
            saved.append(search_data)
        
        return jsonify({"saved": saved}), 200
        
    except Exception as e:
        print(f"Get saved searches error: {e}")
        return jsonify({"error": str(e), "saved": []}), 200


# Helper functions

def is_user_online(db, user_id):
    """Check if user is currently online"""
    try:
        presence_doc = db.collection('presence').document(user_id).get()
        if presence_doc.exists:
            presence = presence_doc.to_dict()
            last_seen = presence.get('lastSeen')
            if last_seen:
                # Consider online if seen within last 5 minutes
                diff = datetime.datetime.now() - last_seen
                return diff.total_seconds() < 300
        return False
    except:
        return False


def get_followers_count(db, user_id):
    """Get follower count for user"""
    try:
        followers = db.collection('follows')\
            .where(filter=firestore.FieldFilter('followee', '==', user_id))\
            .stream()
        return sum(1 for _ in followers)
    except:
        return 0


def save_search_analytics(query, search_type, results_count, skills):
    """Save search for analytics and trending"""
    try:
        db = get_db()
        analytics = {
            'query': query,
            'type': search_type,
            'resultsCount': results_count,
            'skills': skills,
            'timestamp': datetime.datetime.now()
        }
        db.collection('search_analytics').document().set(analytics)
    except Exception as e:
        print(f"Analytics save error: {e}")
@search_bp.route('/featured', methods=['GET'])
@cached(timeout=600)
def get_featured():
    """Get a featured spotlight (Creator & Project)"""
    try:
        db = get_db()
        featured = {}
        
        # 1. Top Creator (Score > 1000 or manually featured)
        # For MVP, just get random high-xp user
        users = db.collection('users').order_by('xp', direction=firestore.Query.DESCENDING).limit(1).stream()
        for u in users:
            d = u.to_dict()
            featured['creator'] = {
                'uid': u.id,
                'name': d.get('name'),
                'bio': d.get('bio'),
                'avatar': d.get('avatar_url'),
                'skills': d.get('skills', [])[:3]
            }

        # 2. Trending Project (Most Likes in last 7 days)
        # Using simple sort for MVP
        projects = db.collection('posts').where(filter=firestore.FieldFilter('status', '==', 'active')).order_by('likes', direction=firestore.Query.DESCENDING).limit(1).stream()
        for p in projects:
            d = p.to_dict()
            featured['project'] = {
                'id': p.id,
                'title': d.get('title'),
                'description': d.get('description'),
                'image': d.get('media_urls', [])[0] if d.get('media_urls') else None
            }
            
        return jsonify(featured), 200
    except Exception as e:
        print(f"Featured error: {e}")
        return jsonify({}), 200

@search_bp.route('/skill_graph', methods=['GET'])
@cached(timeout=3600)
def get_skill_graph():
    """Return related skills for the visualization"""
    # In a real app, this would be computed from user co-occurrence
    # Hardcoded graph for MVP demo
    graph = {
        'React': ['Redux', 'JavaScript', 'TypeScript', 'Node.js', 'Next.js'],
        'Python': ['Django', 'Flask', 'Data Science', 'Machine Learning', 'AI'],
        'Machine Learning': ['Python', 'TensorFlow', 'PyTorch', 'Data Analysis'],
        'UI/UX': ['Figma', 'Adobe XD', 'Prototyping', 'User Research'],
        'Node.js': ['Express', 'MongoDB', 'JavaScript', 'Backend'],
        'Unity': ['C#', 'Game Development', '3D Modeling', 'VR/AR']
    }
    
    # Check if querying specific node
    root = request.args.get('root')
    if root:
        # Find closest match
        related = []
        for key, vals in graph.items():
            if root.lower() in key.lower():
                related = vals
                break
        return jsonify({'root': root, 'related': related}), 200

    return jsonify(graph), 200
