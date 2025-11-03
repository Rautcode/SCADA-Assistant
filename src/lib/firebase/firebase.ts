
import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { firebaseConfig } from './config';

function isFirebaseConfigValid(config: Partial<FirebaseOptions>): config is FirebaseOptions {
    return !!(config.apiKey && config.authDomain && config.projectId);
}

let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (typeof window !== 'undefined') {
    app = !getApps().length && isFirebaseConfigValid(firebaseConfig)
      ? initializeApp(firebaseConfig)
      : (getApps().length > 0 ? getApp() : null);

    if (app) {
        auth = getAuth(app);
        db = getFirestore(app);

        enableIndexedDbPersistence(db).catch((err) => {
            if (err.code == 'failed-precondition') {
                console.warn('Firestore persistence failed: multiple tabs open.');
            } else if (err.code == 'unimplemented') {
                console.warn('Firestore persistence not available in this browser.');
            }
        });
    }
}


export { app, auth, db };
