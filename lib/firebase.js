'use client'

import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged as onAuthStateChangedFirebase,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const requiredEnv = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
]
export const missingFirebaseEnv = requiredEnv.filter(key => !process.env[key])
export const firebaseConfigured = missingFirebaseEnv.length === 0

if (!firebaseConfigured && typeof window !== 'undefined') {
  window.__TANI_ENV_MISSING__ = missingFirebaseEnv
}

const app = firebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null
export const auth = app ? getAuth(app) : { currentUser: null }

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const DRIVE_TOKEN_KEY = 'tani-drive-token'
const DRIVE_TOKEN_EXP_KEY = 'tani-drive-token-exp'

function makeGoogleProvider(withDriveScope) {
  const p = new GoogleAuthProvider()
  p.setCustomParameters({ prompt: 'select_account' })
  if (withDriveScope) p.addScope(DRIVE_SCOPE)
  return p
}

function isMobileOrEmbedded() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
  const isEmbedded = window.top !== window.self
  return isMobile || isEmbedded
}

export async function signInWithGoogle() {
  if (!firebaseConfigured) throw new Error('Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables and redeploy.')
  const provider = makeGoogleProvider(false)
  if (isMobileOrEmbedded()) return signInWithRedirect(auth, provider)
  try { return await signInWithPopup(auth, provider) }
  catch (err) {
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user') {
      return signInWithRedirect(auth, provider)
    }
    throw err
  }
}

export async function completeRedirectSignIn() {
  if (!firebaseConfigured) return null
  try {
    const result = await getRedirectResult(auth)
    if (result) {
      const cred = GoogleAuthProvider.credentialFromResult(result)
      if (cred?.accessToken && result?.user) {
        // If the returning redirect included Drive scope, store the token
        // (Google will only include scopes we requested; drive.file only present if we asked for it)
        // We can't easily inspect scopes here; assume that if the user did a Drive-connect redirect, we saved a flag.
        const flagged = typeof window !== 'undefined' && sessionStorage.getItem('tani-drive-connecting') === '1'
        if (flagged) {
          saveDriveToken(cred.accessToken)
          sessionStorage.removeItem('tani-drive-connecting')
        }
      }
    }
    return result
  } catch (err) { console.error('Redirect sign-in error:', err); return null }
}

function saveDriveToken(token) {
  if (typeof window === 'undefined') return
  // Google access tokens are typically valid for ~1 hour
  const exp = Date.now() + 55 * 60 * 1000
  localStorage.setItem(DRIVE_TOKEN_KEY, token)
  localStorage.setItem(DRIVE_TOKEN_EXP_KEY, String(exp))
}

export function getDriveToken() {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(DRIVE_TOKEN_KEY)
  const exp = parseInt(localStorage.getItem(DRIVE_TOKEN_EXP_KEY) || '0', 10)
  if (!token || Date.now() >= exp) return null
  return token
}

export function isDriveConnected() { return !!getDriveToken() }

export function disconnectDrive() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DRIVE_TOKEN_KEY)
  localStorage.removeItem(DRIVE_TOKEN_EXP_KEY)
}

export async function connectDrive() {
  if (!firebaseConfigured) throw new Error('Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables and redeploy.')
  const user = auth.currentUser
  if (!user) throw new Error('Please sign in first.')
  const provider = makeGoogleProvider(true)
  if (isMobileOrEmbedded()) {
    if (typeof window !== 'undefined') sessionStorage.setItem('tani-drive-connecting', '1')
    return signInWithRedirect(auth, provider)
  }
  try {
    const result = await reauthenticateWithPopup(user, provider)
    const cred = GoogleAuthProvider.credentialFromResult(result)
    if (cred?.accessToken) {
      saveDriveToken(cred.accessToken)
      return { ok: true, token: cred.accessToken }
    }
    throw new Error('No access token returned')
  } catch (err) {
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user') {
      if (typeof window !== 'undefined') sessionStorage.setItem('tani-drive-connecting', '1')
      return signInWithRedirect(auth, provider)
    }
    throw err
  }
}

export async function signInEmail(email, password) {
  if (!firebaseConfigured) throw new Error('Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables and redeploy.')
  return signInWithEmailAndPassword(auth, email, password)
}
export async function signUpEmail(email, password, displayName) {
  if (!firebaseConfigured) throw new Error('Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables and redeploy.')
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) await updateProfile(cred.user, { displayName })
  return cred
}
export async function resetPassword(email) {
  if (!firebaseConfigured) throw new Error('Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables and redeploy.')
  return sendPasswordResetEmail(auth, email)
}
export async function signOut() {
  if (!firebaseConfigured) return null
  disconnectDrive()
  return fbSignOut(auth)
}

export function onAuthStateChanged(firebaseAuth, callback) {
  if (!firebaseConfigured) {
    callback(null)
    return () => {}
  }
  return onAuthStateChangedFirebase(firebaseAuth, callback)
}

export async function authedFetch(url, options = {}) {
  const user = auth.currentUser
  const headers = { ...(options.headers || {}) }
  if (user) {
    const token = await user.getIdToken()
    headers['Authorization'] = `Bearer ${token}`
  }
  const driveToken = getDriveToken()
  if (driveToken) headers['X-Drive-Token'] = driveToken
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
  return fetch(url, { ...options, headers })
}
