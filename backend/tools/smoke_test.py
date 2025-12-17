"""
Simple smoke-test for Campus Project Hub backend.

Usage:
  # Demo mode (no Firebase API key): uses X-Demo-Uid header
  python smoke_test.py --demo

  # Real Firebase mode (requires FIREBASE_API_KEY env var or --api-key)
  python smoke_test.py --email you@school.edu --password YourPass123 --api-key YOUR_FIREBASE_WEB_API_KEY

This script will (1) sign in (or use demo), (2) call /auth/verify-token, (3) POST /feed/create, (4) GET /feed
"""
import os
import requests
import argparse
import json

DEFAULT_BACKEND = os.environ.get('BACKEND_URL', 'http://127.0.0.1:5000/api')

def firebase_sign_in_rest(api_key, email, password):
    url = f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}'
    payload = { 'email': email, 'password': password, 'returnSecureToken': True }
    r = requests.post(url, json=payload)
    r.raise_for_status()
    return r.json()  # contains idToken, localId (uid)

def run_demo_flow(base_url, uid='demo_user'):
    headers = { 'X-Demo-Uid': uid }
    print('Demo mode: using X-Demo-Uid header =', uid)

    # Attempt to create a post using demo uid (server accepts DEMO_UID via middleware)
    post_payload = {
        'title': 'Demo Smoke Test Post',
        'description': 'This is a test post created by smoke_test (demo).',
        'skills_needed': ['Python', 'React']
    }
    r = requests.post(f'{base_url}/feed/create', json=post_payload, headers=headers)
    print('POST /feed/create ->', r.status_code, r.text)

    r2 = requests.get(f'{base_url}/feed')
    print('GET /feed ->', r2.status_code)
    try:
        print(json.dumps(r2.json(), indent=2)[:1000])
    except Exception:
        print(r2.text[:1000])

def run_firebase_flow(base_url, api_key, email, password):
    print('Signing in to Firebase via REST...')
    result = firebase_sign_in_rest(api_key, email, password)
    id_token = result.get('idToken')
    uid = result.get('localId')
    print('Signed in, uid=', uid)

    headers = { 'Authorization': f'Bearer {id_token}' }

    # Verify-token
    r = requests.post(f'{base_url}/auth/verify-token', json={ 'idToken': id_token })
    print('/auth/verify-token ->', r.status_code, r.text)

    # Create post
    post_payload = {
        'title': 'Smoke Test Post',
        'description': 'This is a smoke-test post created via the script.',
        'skills_needed': ['Python']
    }
    r2 = requests.post(f'{base_url}/feed/create', json=post_payload, headers=headers)
    print('POST /feed/create ->', r2.status_code, r2.text)

    # Get feed
    r3 = requests.get(f'{base_url}/feed', headers=headers)
    print('GET /feed ->', r3.status_code)
    try:
        print(json.dumps(r3.json(), indent=2)[:1000])
    except Exception:
        print(r3.text[:1000])

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--demo', action='store_true')
    p.add_argument('--email')
    p.add_argument('--password')
    p.add_argument('--api-key')
    p.add_argument('--backend', default=DEFAULT_BACKEND)
    args = p.parse_args()

    base = args.backend.rstrip('/')

    if args.demo or (not args.api_key and not os.environ.get('FIREBASE_API_KEY')):
        run_demo_flow(base, uid=os.environ.get('DEMO_UID', 'demo_user'))
    else:
        api_key = args.api_key or os.environ.get('FIREBASE_API_KEY')
        if not args.email or not args.password:
            print('Provide --email and --password for Firebase sign-in mode')
            return
        run_firebase_flow(base, api_key, args.email, args.password)

if __name__ == '__main__':
    main()
