import requests
import sys

BASE_URL = "http://localhost:5000/api/auth"

def test_login(email, password):
    print(f"Testing login for {email}...")
    try:
        resp = requests.post(f"{BASE_URL}/login", json={"email": email, "password": password})
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Request failed: {e}")

def test_register(email, password, name):
    print(f"Testing register for {email}...")
    try:
        resp = requests.post(f"{BASE_URL}/register", json={"email": email, "password": password, "name": name})
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    # Test case from user report
    test_login("ritik", "1234") 
    # Also valid email test
    test_login("ritik@test.edu", "1234")
    
    # Register test
    test_register("newuser@test.edu", "password123", "New User")
