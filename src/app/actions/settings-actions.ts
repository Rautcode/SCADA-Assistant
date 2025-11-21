
'use server';

import { z } from "zod";
import { settingsSchema } from "@/lib/types/database";
import { getUserSettingsFromDb, saveUserSettingsToDb } from "@/services/database-service";
import { headers } from 'next/headers';
import { initAdmin } from "@/lib/firebase/admin";


// Helper to get the authenticated user's UID from the request headers
async function getAuthenticatedUserUid(): Promise<string | null> {
    const adminApp = await initAdmin();
    const auth = adminApp.auth();
    const authorization = headers().get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
        const idToken = authorization.split('Bearer ')[1];
        try {
            const decodedToken = await auth.verifyIdToken(idToken);
            return decodedToken.uid;
        } catch (error) {
            console.error("Error verifying Firebase ID token:", error);
            return null;
        }
    }
    return null;
}


// This function is called by client components to get the current user's settings.
// It is secure because it uses the server-side auth session to identify the user.
export async function getUserSettings() {
  const userId = await getAuthenticatedUserUid();
  if (!userId) {
    // Return null or throw an error if the user is not authenticated.
    // Returning null is often safer for client-side consumption.
    return null;
  }
  const settings = await getUserSettingsFromDb(userId);
  return settings;
}

export async function saveUserSettings(settings: z.infer<typeof settingsSchema>): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthenticatedUserUid();
  if (!userId) {
    return { success: false, error: "User is not authenticated." };
  }

  try {
    await saveUserSettingsToDb(userId, settings);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save user settings:", error);
    return { success: false, error: "An unexpected error occurred while saving settings." };
  }
}
