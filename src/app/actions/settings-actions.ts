
'use server';

import { z } from "zod";
import { settingsSchema } from "@/lib/types/database";
import { getUserSettingsFromDb, saveUserSettingsToDb } from "@/services/database-service";
import { getAuthenticatedUser } from "@genkit-ai/next/lib/auth";

// This function is called by client components to get the current user's settings.
// It is secure because it uses the server-side auth session to identify the user.
export async function getUserSettings() {
  const user = await getAuthenticatedUser();
  if (!user) {
    // Return null or throw an error if the user is not authenticated.
    // Returning null is often safer for client-side consumption.
    return null;
  }
  const userId = user.uid;
  const settings = await getUserSettingsFromDb(userId);
  return settings;
}

export async function saveUserSettings(settings: z.infer<typeof settingsSchema>): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "User is not authenticated." };
  }
  const userId = user.uid;

  try {
    await saveUserSettingsToDb(userId, settings);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save user settings:", error);
    return { success: false, error: "An unexpected error occurred while saving settings." };
  }
}

    

    

    
