'use client'

import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

function isMobileOrEmbedded() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
  const isEmbedded = window.top !== window.self
  return isMobile || isEmbedded
}

export async function signInWithGoogle() {
  // Use redirect on mobile / embedded iframes (more reliable), popup on desktop
  if (isMobileOrEmbedded()) {
    return signInWithRedirect(auth, googleProvider)
  }
  try {
    return await signInWithPopup(auth, googleProvider)
  } catch (err) {
    // Fallback to redirect if popup is blocked
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user') {
      return signInWithRedirect(auth, googleProvider)
    }
    throw err
  }
}

// Complete a pending redirect sign-in (should be called once on app load)
export async function completeRedirectSignIn() {
  try { return await getRedirectResult(auth) }
  catch (err) { console.error('Redirect sign-in error:', err); return null }
}

export async function signInEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signUpEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await updateProfile(cred.user, { displayName })
  }
  return cred
}

export async function signOut() {
  return fbSignOut(auth)
}

export { onAuthStateChanged }

export async function authedFetch(url, options = {}) {
  const user = auth.currentUser
  const headers = { ...(options.headers || {}) }
  if (user) {
    const token = await user.getIdToken()
    headers['Authorization'] = `Bearer ${token}`
  }
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(url, { ...options, headers })
}
