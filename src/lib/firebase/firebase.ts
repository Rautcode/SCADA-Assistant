
import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { firebaseConfig } from './config';

// A function to check if the config is valid
function isFirebaseConfigValid(config: Partial<FirebaseOptions>): config is FirebaseOptions {
    return !!(config.apiKey && config.authDomain && config.projectId);
}

// Initialize Firebase
const app = !getApps().length && isFirebaseConfigValid(firebaseConfig)
  ? initializeApp(firebaseConfig)
  : (getApps().length > 0 ? getApp() : null);

const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// Enable persistence
if (typeof window !== 'undefined' && db) {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled
            // in one tab at a a time.
            console.warn('Firestore persistence failed: multiple tabs open.');
        } else if (err.code == 'unimplemented') {
            // The current browser does not support all of the
            // features required to enable persistence
            console.warn('Firestore persistence not available in this browser.');
        }
    });
}


export { app, auth, db };
