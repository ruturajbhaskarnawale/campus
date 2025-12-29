# Migration Log

Target DB: `backend/campus.db`

## Users Table
Existing columns: ['location', 'university', 'account_status', 'current_streak', 'password_hash', 'xp_points', 'id', 'created_at', 'updated_at', 'cover_photo_url', 'role', 'linkedin_url', 'following_count', 'department', 'username', 'is_online', 'is_verified', 'followers_count', 'twitter_url', 'fcm_token', 'last_active_at', 'uid', 'bio', 'level', 'full_name', 'graduation_year', 'student_id', 'github_url', 'avatar_url', 'website_url', 'email']

- Column `followers_count` already exists.
- Column `following_count` already exists.
- Column `xp_points` already exists.
- Column `level` already exists.
- Column `github_url` already exists.
- Column `linkedin_url` already exists.
- Column `website_url` already exists.
- Adding column `views_count` (INTEGER DEFAULT 0)...

## SavedPosts Table
- Table `saved_posts` exists.

**Migration Completed Successfully.**
