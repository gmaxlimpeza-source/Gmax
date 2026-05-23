import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 
export const auth = getAuth(app);

// Enable Firestore persistent storage (Offline cache)
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence precondition: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence unimplemented: Browser does not support IndexedDB');
    } else {
      console.error('Firestore persistence error:', err);
    }
  });
}
