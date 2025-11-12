
import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { firebaseConfig } from './config';

function isFirebaseConfigValid(config: Partial<FirebaseOptions>): config is FirebaseOptions {
    return !!(config.apiKey && config.authDomain && config.projectId);
}

// This function is now the single source of truth for initializing the client-side app.
function initializeClientApp() {
    if (getApps().length === 0 && isFirebaseConfigValid(firebaseConfig)) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

const app = initializeClientApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Attempt to enable persistence, but handle errors gracefully.
if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Firestore persistence failed: multiple tabs open.');
        } else if (err.code == 'unimplemented') {
            console.warn('Firestore persistence not available in this browser.');
        }
    });
}

export { app, auth, db };
