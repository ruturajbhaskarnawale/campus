// Firebase initialization and auth helpers (modular SDK v9+)
import appConfig from './config';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';

let firebaseApp = null;
let auth = null;

export function initFirebase() {
  if (!appConfig || appConfig.apiKey === 'REPLACE_ME') {
    throw new Error('Firebase config is not set. Update frontend/src/core/firebase/config.js with your web app config.');
  }

  if (!getApps().length) {
    firebaseApp = initializeApp(appConfig);
    auth = getAuth(firebaseApp);
  } else {
    auth = getAuth();
  }

  return { firebaseApp, auth };
}

export async function signUp(email, password) {
  if (!auth) initFirebase();
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function signIn(email, password) {
  if (!auth) initFirebase();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function signOut() {
  if (!auth) initFirebase();
  await fbSignOut(auth);
}

export async function getIdToken(user, forceRefresh = false) {
  if (!auth) initFirebase();
  const current = user || auth.currentUser;
  if (!current) return null;
  return current.getIdToken(forceRefresh);
}

export function getCurrentUser() {
  if (!auth) initFirebase();
  return auth.currentUser;
}

// Initialize services immediately if app is already initialized
if (getApps().length) {
    const app = getApps()[0];
    // We lazy load these getters to ensure initFirebase is called if needed, 
    // but typically we want singletons.
}

export function getDb() {
    if (!firebaseApp) initFirebase();
    const { getFirestore } = require('firebase/firestore');
    return getFirestore(firebaseApp);
}

export function getStorage() {
    if (!firebaseApp) initFirebase();
    const { getStorage } = require('firebase/storage');
    return getStorage(firebaseApp);
}
