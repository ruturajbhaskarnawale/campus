from flask import Flask
from flask_cors import CORS
from lib.core.utils.firebase_config import initialize_firebase
from lib.features.auth.routes import auth_bp
# --- ADD THIS IMPORT ---
from lib.features.feed.routes import feed_bp 
from lib.features.feed.top_users import top_users_bp
from lib.features.social.routes import social_bp
from lib.features.notifications.routes import notifications_bp
from lib.features.messages.routes import messages_bp
from lib.features.moderation.routes import moderation_bp
from lib.features.admin.routes import admin_bp
from lib.features.search.routes import search_bp
from lib.features.profile.routes import profile_bp

app = Flask(__name__)
# Enable CORS with proper configuration for all routes
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": False
    }
})

initialize_firebase()

app.register_blueprint(auth_bp, url_prefix='/api/auth')
# --- ADD THIS REGISTRATION ---
app.register_blueprint(feed_bp, url_prefix='/api/feed')
app.register_blueprint(top_users_bp, url_prefix='/api')
app.register_blueprint(social_bp, url_prefix='/api/social')
app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
app.register_blueprint(messages_bp, url_prefix='/api/messages')
app.register_blueprint(moderation_bp, url_prefix='/api/moderation')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(search_bp, url_prefix='/api/search')
app.register_blueprint(profile_bp, url_prefix='/api/profile')

## Simple rate-limiting middleware (very small, per-process)
from flask import request
from time import time
_RATE_LIMIT = {}
@app.before_request
def simple_rate_limit():
    # 100 requests per 60 seconds per IP
    ip = request.remote_addr or 'unknown'
    now = time()
    window = 60
    limit = 100
    entry = _RATE_LIMIT.get(ip, {'t': now, 'count': 0})
    if now - entry['t'] > window:
        entry = {'t': now, 'count': 0}
    entry['count'] += 1
    _RATE_LIMIT[ip] = entry
    if entry['count'] > limit:
        from flask import abort
        abort(429)

@app.route('/')
def home():
    return "Campus Project Hub Backend is Running! 🚀"

if __name__ == '__main__':
    # Initialize DB (create missing tables)
    from lib.db.database import init_db
    print(">> Initializing Database (Checking for missing tables)...")
    init_db()
    print(">> Database Ready.")

    # host='0.0.0.0' makes the server accessible from other devices in the network
    app.run(host='0.0.0.0', debug=True, port=5000)
