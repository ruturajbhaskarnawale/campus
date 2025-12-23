from flask import request, jsonify
import jwt
import datetime
from functools import wraps
from lib.core.utils.response import error_response

SECRET_KEY = "campus-hub-secret-key-change-in-prod"

def generate_token(user):
    payload = {
        'id': user.id,
        'uid': user.uid,
        'email': user.email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_request_token(req):
    auth_header = req.headers.get('Authorization', '')
    token = None
    
    if auth_header.startswith('Bearer '):
        token = auth_header.split('Bearer ')[1]
    
    if not token and 'idToken' in (req.get_json(silent=True) or {}):
        token = req.get_json().get('idToken')

    if not token:
        return None, error_response('Missing Authorization Token', status=401)
        
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return decoded, None
    except jwt.ExpiredSignatureError:
        return None, error_response('Token has expired', status=401)
    except jwt.InvalidTokenError as e:
        return None, error_response(f'Invalid token: {str(e)}', status=401)
    except Exception as e:
        return None, error_response(f'Auth error: {str(e)}', status=401)

def require_auth(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        decoded, error_resp = verify_request_token(request)
        if error_resp:
            return error_resp
        kwargs['decoded_token'] = decoded
        return func(*args, **kwargs)
    return wrapper
