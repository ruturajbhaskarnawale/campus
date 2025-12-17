# Campus Project Hub — API Reference

All endpoints return a standardized envelope:

```
{ "success": true|false, "data": <any>|null, "error": <string>|null }
```

When `success` is false the `error` field contains a short message.

Base URL: `http://<HOST>:5000/api` (use `frontend/src/core/api/config.js` to change host)

---

## Auth

- `POST /auth/register`
  - Description: (legacy) creates a Firebase Auth user via Admin SDK and profile in Firestore.
  - Body: `{ "email": string, "password": string, "name": string }`
  - Auth: none (but server enforces `.edu` email domain in current implementation)
  - Response: uses envelope. Example success `data`: `{ "message": "User registered successfully", "uid": "<uid>" }`

- `POST /auth/login`
  - Description: placeholder; frontend should perform Firebase client sign-in and obtain idToken.
  - Response: envelope with message.

- `POST /auth/verify-token`
  - Description: Verifies a Firebase ID token (client should send `{ idToken }` or `Authorization: Bearer <token>`)
  - Body: `{ "idToken": string }` (optional if Authorization header is set)
  - Response (success): `{ "data": { "profile": { ... } } }` — profile created if missing.
  - Auth: requires idToken (server verifies with firebase_admin)

- `GET|PUT /auth/profile`
  - Query/Headers: Accepts `uid` query param or `X-Demo-Uid` header for local testing, or Authorization Bearer token.
  - GET response `data`: `{ "profile": { name, email, skills, github_link, avatar_url, resume_url, bio, uid } }
  - PUT body: allowed fields `{ name, skills, github_link, avatar_url, resume_url, bio }`. Skills may be CSV string or array.
  - Auth: PUT should be called with Authorization Bearer token (or demo uid for dev). Returns 401 if not authenticated.

- `POST /auth/profile/upload_avatar` and `/auth/profile/upload_resume`
  - Form multipart with `file` and either `idToken` or demo uid header. Stores to Firebase Storage and updates user profile.
  - Auth: requires idToken or demo uid for dev flows.

---

## Feed (Projects / Posts)

- `POST /feed/create`
  - Description: Create a project post. Requires Authentication (Bearer idToken). The server will reject toxic descriptions via ML validator.
  - Body: `{ title: string, description: string, skills_needed: [string], media_urls?: [string] }`
  - Response: `data: { message: 'Project posted successfully!', postId: '<id>' }`
  - Auth: **required** — send Authorization header `Bearer <idToken>`.

- `GET /feed`
  - Query: optional `skill=<skillName>` to filter by `skills_needed`.
  - Response: `data: [ { post }, ... ]` where each post includes `id,title,description,skills_needed,author_name,author_uid,timestamp,likes,media_urls`.
  - Auth: public (but including idToken will expose user-specific data where applicable).

- `GET /feed/<post_id>`
  - Response: `data: { post }`

- `POST /feed/upload_media`
  - Form multipart `file` uploads media to Firebase Storage and returns `data: { url: '<public_url>' }`.

- `POST /feed/<post_id>/react`
  - Body: `{ reaction: 'like' }` — currently supports 'like' which increments a counter.

- `GET|POST /feed/<post_id>/comments`
  - GET returns `data: [ { comment }, ... ]`
  - POST body: `{ text: string, parentId?: string, author_name?: string }` — creates a comment.

- `POST /feed/<post_id>/bookmark`
  - Body: `{ uid: string }` (or authenticated user via token in future). Saves to `users/<uid>/bookmarks`.

- `GET /feed/user/<user_id>/bookmarks`
  - Returns user's bookmarks list.

---

## Social (followers / following)

- `GET /social/followers/<user_id>`
- `GET /social/following/<user_id>`

These endpoints return arrays of user references. Auth: public for read access in current implementation.

---

## Messages & Notifications (overview)

- `GET /messages/threads` — returns list of conversation threads for the authenticated user (current setup supports demo user).
- `GET /notifications/list/<uid>` — returns notifications list for a user.

Auth: messaging/notification POST endpoints (sending messages, creating notifications) should be called with Authorization Bearer idToken.

---

Notes & Next Steps
- Clients should authenticate with Firebase client SDK (email/password or other providers), obtain the ID token and include it on requests via `Authorization: Bearer <idToken>`.
- All protected endpoints will be migrated to require token verification and return the standardized envelope. The frontend already contains an axios interceptor to attach stored idToken automatically (`frontend/src/core/api/client.js`).
