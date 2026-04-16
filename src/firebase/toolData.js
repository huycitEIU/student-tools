import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config.js';

const ensureFirestoreReady = () => {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firestore is not configured yet.');
  }
};

const toolDocRef = (uid, toolId) => doc(db, 'users', uid, 'toolData', toolId);

export const loadToolData = async (uid, toolId, fallbackValue) => {
  if (!uid || !isFirebaseConfigured || !db) {
    return fallbackValue;
  }

  ensureFirestoreReady();
  const snapshot = await getDoc(toolDocRef(uid, toolId));

  if (!snapshot.exists()) {
    return fallbackValue;
  }

  const data = snapshot.data();
  return data?.value ?? fallbackValue;
};

export const saveToolData = async (uid, toolId, value) => {
  ensureFirestoreReady();
  await setDoc(toolDocRef(uid, toolId), {
    value,
    updatedAt: serverTimestamp()
  });
};

export const deleteToolData = async (uid, toolId) => {
  ensureFirestoreReady();
  await deleteDoc(toolDocRef(uid, toolId));
};
