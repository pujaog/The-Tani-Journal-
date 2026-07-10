#!/usr/bin/env python3
import os, time, json, requests, random
from datetime import datetime

# Read .env for Firebase API key
env = {}
with open('.env') as f:
    for line in f:
        line=line.strip()
        if not line or line.startswith('#'): continue
        if '=' in line:
            k,v=line.split('=',1)
            env[k.strip()]=v.strip()

API_KEY = env.get('NEXT_PUBLIC_FIREBASE_API_KEY')
BASE = 'http://localhost:3000'

now = int(time.time())
email = f"e2e_test_{now}@example.com"
password = 'Testpass123!'

print('Using Firebase API key:', '***' + API_KEY[-4:] if API_KEY else None)
print('Test email:', email)

assert API_KEY, 'Missing Firebase API key in .env'

s = requests.Session()

# Sign up
print('Signing up test user...')
resp = s.post(f'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}', json={"email":email, "password":password, "returnSecureToken":True})
print('signup status', resp.status_code, resp.text[:200])
if resp.status_code not in (200, 400):
    raise SystemExit('Sign-up failed')

# If already exists, try sign-in
if resp.status_code == 400 and 'EMAIL_EXISTS' in resp.text:
    print('Email exists, signing in...')

# Sign in
resp = s.post(f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}', json={"email":email, "password":password, "returnSecureToken":True})
print('signin status', resp.status_code, resp.text[:200])
resp.raise_for_status()
j = resp.json()
id_token = j['idToken']
print('Got idToken (len):', len(id_token))

headers = { 'Authorization': f'Bearer {id_token}', 'Content-Type': 'application/json' }

# Save profile
profile_payload = {"displayName":"E2E Tester","photoURL":"","bio":"Automated E2E test user"}
print('Patching profile...')
resp = s.patch(f'{BASE}/api/me', headers=headers, data=json.dumps(profile_payload))
print('patch /api/me', resp.status_code, resp.text[:300])

# Publish post
post_payload = {"title":"E2E Test Post","content":"This is an automated E2E test post","mood":"✨ Reflective","images":[],"visibility":"private"}
print('Publishing post...')
resp = s.post(f'{BASE}/api/posts', headers=headers, data=json.dumps(post_payload))
print('post create', resp.status_code, resp.text[:300])
if resp.ok:
    pid = resp.json().get('post', {}).get('id')
    print('Created post id:', pid)

# Fetch my posts
print('Fetching my posts...')
resp = s.get(f'{BASE}/api/posts?scope=mine', headers=headers)
print('GET /api/posts?scope=mine', resp.status_code)
print(resp.text[:800])

print('E2E run complete')
