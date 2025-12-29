import requests
import json

BASE_URL = "http://localhost:5000/api/auth"

def test_signup(email, password, name):
    print(f"Testing Signup for {email}...")
    try:
        res = requests.post(f"{BASE_URL}/register", json={
            "email": email,
            "password": password,
            "name": name
        })
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
        return res
    except Exception as e:
        print(f"Error: {e}")

def test_login(email, password):
    print(f"Testing Login for {email}...")
    try:
        res = requests.post(f"{BASE_URL}/login", json={
            "email": email,
            "password": password
        })
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
        return res
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Test 1: New User
    email = f"test_{requests.utils.quote('dev@campus.edu')}" # simple unique
    import time
    email = f"test_{int(time.time())}@campus.edu"
    
    signup_res = test_signup(email, "password123", "Test User")
    
    if signup_res and signup_res.status_code == 201:
        print("Signup Successful. Attempting Login...")
        test_login(email, "password123")
    else:
        print("Signup Failed. Skipping Login.")
