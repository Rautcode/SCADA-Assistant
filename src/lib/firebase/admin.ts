
import * as admin from 'firebase-admin';

// This is a one-time initialization of the Admin SDK.
let app: admin.app.App | undefined;

function initializeAdminApp(): admin.app.App {
  if (admin.apps.length) {
    return admin.app();
  }
  
  // This environment variable should be set in your deployment environment.
  // It's a JSON string, not a file path.
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error("Firebase service account key is not configured in environment variables. Please set FIREBASE_SERVICE_ACCOUNT_KEY.");
  }
  
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return app;
  } catch (error) {
    console.error("Error parsing Firebase service account key:", error);
    throw new Error("Could not initialize Firebase Admin SDK. Service account key may be malformed.");
  }
}

export function getAdminApp() {
    return initializeAdminApp();
}

    