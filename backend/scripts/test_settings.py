
import sys
import os
import requests

# Base URL for local backend
BASE_URL = "http://localhost:5000/api"

def test_settings_flow():
    try:
        print("1. Testing Login to get Token...")
        # Login
        login_payload = {"email": "arjun.sharma@campus.edu", "password": "password123"}
        res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
        
        if res.status_code != 200:
            print(f"Login Failed: {res.status_code} {res.text}")
            return
            
        token = res.json().get('token')
        headers = {"Authorization": f"Bearer {token}"}
        print("Login Success. Token acquired.")
        
        print("\n2. Testing GET /settings")
        res = requests.get(f"{BASE_URL}/settings", headers=headers)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
        
        if res.status_code == 404:
            print("ERROR: /api/settings not found. Blueprint registration issue?")
        elif res.status_code == 500:
            print("ERROR: Internal Server Error.")
            
        print("\n3. Testing PUT /settings")
        res = requests.put(f"{BASE_URL}/settings", json={"theme": "dark"}, headers=headers)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_settings_flow()
