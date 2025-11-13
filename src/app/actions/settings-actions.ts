
'use server';

import { z } from "zod";
import { settingsSchema } from "@/lib/types/database";
import { getUserSettingsFromDb, saveUserSettingsToDb } from "@/services/database-service";

export async function saveUserSettings(input: { userId: string, settings: z.infer<typeof settingsSchema> }): Promise<{ success: boolean; error?: string }> {
  try {
    await saveUserSettingsToDb(input.userId, input.settings);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save user settings:", error);
    return { success: false, error: "An unexpected error occurred while saving settings." };
  }
}

export async function getUserSettings(input: { userId: string }) {
  try {
    return await getUserSettingsFromDb(input.userId);
  } catch (error) {
    console.error('Failed to get user settings from DB:', error);
    return null;
  }
}
