import requests
import json
import sys

BASE_URL = "http://localhost:5000/api"

def run_test():
    session = requests.Session()
    
    # 1. Login
    print(">> Testing Login...")
    try:
        res = session.post(f"{BASE_URL}/auth/login", json={
            "email": "test@example.com",
            "password": "password"
        })
        if res.status_code != 200:
            print(f"Login Failed: {res.text}")
            return
        
        data = res.json()
        token = data['token']
        my_uid = data['uid']
        print(f"Login Success! Token obtained. My UID: {my_uid}")
        
    except Exception as e:
        print(f"Login Exception: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Search Users (to find someone to chat with)
    print("\n>> Searching for users...")
    try:
        res = requests.get(f"{BASE_URL}/search/unified?type=users&limit=5", headers=headers)
        if res.status_code != 200:
            print(f"Search Failed: {res.text}")
            return
        
        users = res.json().get('users', [])
        target_user = next((u for u in users if u['uid'] != my_uid), None)
        
        if not target_user:
            print("No other users found to chat with.")
            # return
            # If seed didn't work, maybe we are alone.
        else:
            print(f"Found target user: {target_user['name']} ({target_user['uid']})")
    except Exception as e:
        print(f"Search Exception: {e}")
        return

    # 3. Init Conversation
    if target_user:
        print(f"\n>> Initializing conversation with {target_user['name']}...")
        convo_id = None
        try:
            res = requests.post(f"{BASE_URL}/messages/init", json={
                "type": "direct",
                "target_uids": [target_user['uid']]
            }, headers=headers)
            
            if res.status_code not in [200, 201]:
                print(f"Init Failed: {res.text}")
                return
            
            convo_data = res.json()
            convo_id = convo_data['conversation_id']
            print(f"Conversation Initialized! ID: {convo_id} (New: {convo_data.get('is_new')})")
            
        except Exception as e:
            print(f"Init Exception: {e}")
            return

        # 4. Send Message
        if convo_id:
            print(f"\n>> Sending message to conversation {convo_id}...")
            try:
                res = requests.post(f"{BASE_URL}/messages/send", json={
                    "conversation_id": convo_id,
                    "text": "Hello from migration verification!"
                }, headers=headers)
                
                if res.status_code != 201:
                    print(f"Send Failed: {res.text}")
                else:
                    print(f"Message Sent! ID: {res.json()['data']['id']}")
                    
            except Exception as e:
                print(f"Send Exception: {e}")

            # 5. Fetch Thread
            print(f"\n>> Fetching thread {convo_id}...")
            try:
                res = requests.get(f"{BASE_URL}/messages/thread/{convo_id}", headers=headers)
                if res.status_code != 200:
                    print(f"Fetch Thread Failed: {res.text}")
                else:
                    msgs = res.json()['messages']
                    print(f"Threads Fetched. Count: {len(msgs)}")
                    print(f"Latest: {msgs[0]['text']}")
            except Exception as e:
                print(f"Fetch Thread Exception: {e}")

    # 6. List Threads
    print("\n>> Listing all threads...")
    try:
        res = requests.get(f"{BASE_URL}/messages/threads", headers=headers)
        if res.status_code != 200:
            print(f"List Threads Failed: {res.text}")
        else:
            threads = res.json()['threads']
            print(f"Threads List Fetched. Count: {len(threads)}")
            for t in threads:
                print(f" - {t['name']}: {t['lastMessage']['text']}")
    except Exception as e:
        print(f"List Threads Exception: {e}")

if __name__ == "__main__":
    run_test()
