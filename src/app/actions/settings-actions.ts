
'use server';

import { z } from "zod";
import { settingsSchema } from "@/lib/types/database";
import { getUserSettingsFromDb, saveUserSettingsToDb } from "@/services/database-service";
import { auth } from "@/auth"; // This will need to be changed or removed if not using next-auth

// This function is called by client components to get the current user's settings.
// It is secure because it uses the server-side auth session to identify the user.
export async function getUserSettings() {
  const session = await auth();
  if (!session?.user?.id) {
    // Return null or throw an error if the user is not authenticated.
    // Returning null is often safer for client-side consumption.
    return null;
  }
  const userId = session.user.id;
  const settings = await getUserSettingsFromDb(userId);
  return settings;
}

export async function saveUserSettings(settings: z.infer<typeof settingsSchema>): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "User is not authenticated." };
  }
  const userId = session.user.id;

  try {
    await saveUserSettingsToDb(userId, settings);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save user settings:", error);
    return { success: false, error: "An unexpected error occurred while saving settings." };
  }
}
