
import requests
import sys
import uuid
import time

BASE_URL = "http://localhost:5000/api"

def print_pass(msg):
    print(f"✅ PASS: {msg}")

def print_fail(msg):
    print(f"❌ FAIL: {msg}")
    sys.exit(1)

def register_user(name, email, password):
    url = f"{BASE_URL}/auth/register"
    data = {"name": name, "email": email, "password": password}
    resp = requests.post(url, json=data)
    if resp.status_code == 201:
        return resp.json()
    return None

def login_user(email, password):
    url = f"{BASE_URL}/auth/login"
    data = {"email": email, "password": password}
    resp = requests.post(url, json=data)
    if resp.status_code == 200:
        return resp.json()
    return None

def verify_full_flow():
    # 1. Register 2 Users
    suffix = str(uuid.uuid4())[:8]
    email1 = f"userA_{suffix}@univ.edu"
    email2 = f"userB_{suffix}@univ.edu"
    
    print(f"Creating users: {email1}, {email2}")
    
    u1 = register_user("User A", email1, "password123")
    u2 = register_user("User B", email2, "password123")
    
    if not u1 or not u2:
        print_fail("Registration failed")
    
    token1 = u1['token']
    uid1 = u1['uid']
    token2 = u2['token']
    uid2 = u2['uid']
    
    print_pass("Registration successful")
    
    # 2. Check User A Search for User B
    headers1 = {"Authorization": f"Bearer {token1}"}
    search_url = f"{BASE_URL}/search/unified?q=User B&type=users"
    resp = requests.get(search_url, headers=headers1)
    results = resp.json()
    
    found = False
    for u in results.get('users', []):
        if u['uid'] == uid2:
            found = True
            break
            
    if found:
        print_pass("Search found target user")
    else:
        print_fail("Search DID NOT find target user")

    # 3. Follow
    follow_url = f"{BASE_URL}/social/follow"
    resp = requests.post(follow_url, json={"follower": uid1, "followee": uid2}, headers=headers1)
    if resp.status_code == 200:
        print_pass("Follow successful")
    else:
        print_fail(f"Follow failed: {resp.text}")

    # 4. Message Init (Implicit via Send or Explicit)
    # Let's try Explicit Init first as per standard flow
    init_url = f"{BASE_URL}/messages/init"
    # Need access to internal ID or pass UIDs? Route expects UIDs.
    # Route: target_uids list
    
    resp = requests.post(init_url, json={"target_uids": [uid2], "type": "direct"}, headers=headers1)
    if resp.status_code in [200, 201]:
        print_pass("Conversation Init successful")
        cid = resp.json()['conversation_id']
    else:
        print_fail(f"Conversation Init failed: {resp.text}")
        
    # 5. Send Message
    msg_url = f"{BASE_URL}/messages/send"
    msg_data = {"conversation_id": cid, "text": "Hello User B!"}
    resp = requests.post(msg_url, json=msg_data, headers=headers1)
    if resp.status_code == 201:
        print_pass("Message Send successful")
    else:
        print_fail(f"Message Send failed: {resp.text}")

    # 6. Verify Dummy Post (User A should have 0 posts naturally)
    # Check Profile feed or Main Feed
    # If "dummy post" is an artifact of registration, maybe it appears in feed?
    feed_url = f"{BASE_URL}/feed/?author_uid={uid1}"
    resp = requests.get(feed_url, headers=headers1)
    if len(resp.json().get('data', [])) == 0:
         print_pass("No dummy posts found on new user profile")
    else:
         print(f"⚠️ WARNING: User has {len(resp.json().get('data', []))} posts immediately. Check content.")

if __name__ == "__main__":
    try:
        verify_full_flow()
        print("\nAll Backend Checks Passed!")
    except Exception as e:
        print_fail(f"Exception: {e}")
