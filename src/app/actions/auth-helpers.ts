'use server';

import { getAdminApp } from '@/lib/firebase/admin';

/**
 * Verifies the Firebase ID token on the server side and returns the UID.
 * This is a secure way to authenticate server actions.
 * @param authToken The Firebase ID token from the client.
 * @returns The user's UID.
 * @throws An error if the token is invalid or the user is not authenticated.
 */
export async function getVerifiedUid(authToken: string): Promise<string> {
    if (!authToken) {
        throw new Error("Auth token is required.");
    }
    try {
        const adminApp = getAdminApp();
        const decodedToken = await adminApp.auth().verifyIdToken(authToken);
        return decodedToken.uid;
    } catch (error) {
        console.error("Error verifying auth token:", error);
        throw new Error("User is not authenticated.");
    }
}
