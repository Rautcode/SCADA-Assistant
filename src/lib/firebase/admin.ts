
import * as admin from 'firebase-admin';

// This is a one-time initialization of the Admin SDK.
let app: admin.app.App | undefined;

export async function initAdmin() {
  if (app) {
    return app;
  }
  
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    // In a real app, you might want to throw an error or handle this differently.
    // For this context, we will log a warning and proceed without admin features if the key is missing.
    console.warn("Firebase service account key is not configured in environment variables. Server-side admin features will be disabled.");
    // Return a mock object that won't throw when `auth()` is called, but whose methods will fail.
    return {
        auth: () => ({
            verifyIdToken: () => Promise.reject(new Error("Admin SDK not initialized."))
        })
    } as unknown as admin.app.App;
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

    