import requests
import json
import sys

BASE_URL = "http://localhost:5000/api"

def register_user(name, email):
    # Try login first
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": "password123"
        })
        if resp.status_code == 200:
            return resp.json()['uid']
    except:
        pass

    # Register
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": "password123",
        "name": name
    })
    if resp.status_code == 201:
        return resp.json()['token'] # In this app, register returns token/user sometimes? 
        # Actually register usually returns 201 created. 
        # Let's just login after register to be safe and get uid.
    
    # Login to get uid
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": "password123"
    })
    if resp.status_code == 200:
        return resp.json()['uid']
    return None

def test_social_counts():
    print("--- Testing Social Counts ---")
    
    # Create main user
    main_uid = register_user("Main User", "main@test.com")
    if not main_uid:
        print("Failed to get Main User")
        return

    print(f"Main User: {main_uid}")
    
    # Create 3 users to follow
    users_to_follow = []
    for i in range(3):
        uid = register_user(f"Followee {i}", f"followee{i}@test.com")
        if uid: users_to_follow.append(uid)
        
    print(f"Users to follow: {users_to_follow}")
    
    # Follow them
    for target in users_to_follow:
        print(f"Following {target}...")
        resp = requests.post(f"{BASE_URL}/social/follow", json={
            "follower": main_uid,
            "followee": target
        })
        print(f"Status: {resp.status_code}, Resp: {resp.text}")

    # Check Notification for the first followee
    first_followee = users_to_follow[0]
    print(f"Checking notifications for {first_followee}...")
    resp = requests.get(f"{BASE_URL}/notifications/list/{first_followee}")
    if resp.status_code == 200:
        notifs = resp.json()
        print(f"Notifications: {len(notifs)}")
        if len(notifs) > 0:
            print(f"SUCCESS: Notification found: {notifs[0]}")
            print(f"Type: {notifs[0].get('type')}, Avatar: {notifs[0].get('avatar')}")
        else:
            print("FAILURE: No notifications found.")
    else:
        print(f"FAILURE: Could not fetch notifications. Status: {resp.status_code}")
    # Let's use search to find self.
    
    print("Checking counts via Search API...")
    resp = requests.get(f"{BASE_URL}/search/unified", params={'q': 'Main User', 'type': 'users'})
    if resp.status_code == 200:
        data = resp.json()
        for u in data.get('users', []):
            if u['uid'] == main_uid:
                print(f"User Found in Search. Data: {u}")
                # Search route might not return counts? 
                # Let's check get_profile endpoint logic if it exists.
                
    # Let's check followers/following endpoints
    resp = requests.get(f"{BASE_URL}/social/following/{main_uid}")
    following_list = resp.json()
    print(f"Following List Length: {len(following_list)}")
    
    # Check if database has counts
    # We can use the inspect schema or just trust the API for now.
    
    if len(following_list) == 3:
        print("SUCCESS: Following count is 3")
    else:
        print(f"FAILURE: Following count is {len(following_list)}")

if __name__ == "__main__":
    test_social_counts()
