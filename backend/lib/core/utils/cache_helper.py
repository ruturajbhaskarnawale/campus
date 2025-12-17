from functools import wraps
from flask import request
import time

# Simple in-memory cache
_CACHE = {}
_CACHE_TTL = 300  # 5 minutes

def cached(timeout=300):
    """
    Simple in-memory cache decorator for Flask routes.
    Keys are based on the request path and query string.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{request.path}?{request.query_string.decode('utf-8')}"
            
            # Check cache
            cached_data = _CACHE.get(cache_key)
            if cached_data:
                timestamp, data = cached_data
                if time.time() - timestamp < timeout:
                    return data
            
            # Execute function
            result = f(*args, **kwargs)
            
            # Store in cache
            _CACHE[cache_key] = (time.time(), result)
            
            return result
        return wrapper
    return decorator

def clear_cache():
    """Clears the entire in-memory cache"""
    global _CACHE
    _CACHE = {}
