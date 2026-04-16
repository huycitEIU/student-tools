import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config.js';

const ensureFirebaseReady = () => {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase is not configured yet.');
  }
};

export const watchAuthState = (callback) => {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
};

export const signUpWithEmail = async ({ email, password, displayName }) => {
  ensureFirebaseReady();

  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName?.trim()) {
    await updateProfile(credential.user, {
      displayName: displayName.trim()
    });
  }

  return credential.user;
};

export const signInWithEmail = async ({ email, password }) => {
  ensureFirebaseReady();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const signOutUser = async () => {
  ensureFirebaseReady();
  await signOut(auth);
};

export const syncAuthDisplayName = async (displayName) => {
  ensureFirebaseReady();

  if (!auth.currentUser) {
    return;
  }

  await updateProfile(auth.currentUser, {
    displayName: displayName?.trim() ?? ''
  });
};
