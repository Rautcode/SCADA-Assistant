import * as admin from 'firebase-admin';

// This configuration is now handled by the environment.
// The key is expected to be in process.env.FIREBASE_SERVICE_ACCOUNT_KEY
let serviceAccount: admin.ServiceAccount | undefined;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  }
} catch (e) {
  console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
}


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
