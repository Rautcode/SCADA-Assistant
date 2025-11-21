
'use server';

import { getAdminApp } from "@/lib/firebase/admin";

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
