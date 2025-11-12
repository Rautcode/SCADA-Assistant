
import * as admin from 'firebase-admin';

// This configuration is for SERVER-SIDE (Admin SDK) authentication and operations.
// It should only be used in server actions and backend flows.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : undefined;

export async function initAdmin() {
    if (admin.apps.length > 0) {
        return admin.app();
    }
    if (!serviceAccount) {
        throw new Error("Firebase service account key is not configured in environment variables.");
    }
    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}
