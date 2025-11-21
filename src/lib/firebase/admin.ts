
import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

let adminApp: admin.app.App;

export function getAdminApp(): admin.app.App {
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
