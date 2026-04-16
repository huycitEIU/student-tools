import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config.js';

const ensureFirestoreReady = () => {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firestore is not configured yet.');
  }
};

const userDocRef = (uid) => doc(db, 'users', uid);

export const ensureUserProfile = async (user) => {
  ensureFirestoreReady();

  const ref = userDocRef(user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      bio: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const createdSnapshot = await getDoc(ref);
    return createdSnapshot.data();
  }

  return snapshot.data();
};

export const saveUserProfile = async (uid, updates) => {
  ensureFirestoreReady();

  const ref = userDocRef(uid);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp()
  });

  const snapshot = await getDoc(ref);
  return snapshot.data();
};
