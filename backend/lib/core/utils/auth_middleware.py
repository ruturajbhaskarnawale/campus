from flask import request
from firebase_admin import auth as fb_auth
from lib.core.utils.response import error_response

def extract_id_token(req):
    # Look in Authorization: Bearer <token>
    auth_header = req.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header.split('Bearer ')[1]
    # Look in JSON body
    try:
        j = req.get_json(silent=True) or {}
        if 'idToken' in j:
            return j.get('idToken')
    except Exception:
        pass
    # Look in form data
    if 'idToken' in req.form:
        return req.form.get('idToken')
    # No token found
    return None

def verify_request_token(req):
    """Verify token found in the request. Returns decoded token dict on success or (None, response) on failure."""
    id_token = extract_id_token(req)
    if not id_token:
        return None, error_response('Missing ID token', status=401)
    try:
        decoded = fb_auth.verify_id_token(id_token)
        return decoded, None
    except Exception as e:
        msg = str(e)
        # Friendly handling for common clock-skew error from Firebase
        if 'Token used too early' in msg or 'used too early' in msg or 'iat' in msg and '>' in msg:
            return None, error_response(
                "Token used too early. Check that your computer/device clock is set correctly, then refresh the ID token and retry.",
                status=401
            )
        return None, error_response(f'Invalid ID token: {msg}', status=401)

def require_auth(func):
    """Decorator for Flask route handlers to enforce Firebase ID token verification.
    On success, the decoded token is passed to the route via keyword arg `decoded_token`.
    """
    from functools import wraps
    from flask import abort

    @wraps(func)
    def wrapper(*args, **kwargs):
        decoded, error_resp = verify_request_token(request)
        if error_resp:
            # error_resp is a Flask response tuple from error_response
            return error_resp
        kwargs['decoded_token'] = decoded
        return func(*args, **kwargs)

    return wrapper
