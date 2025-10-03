
'use server';

import { z } from "zod";
import { settingsSchema } from "@/lib/types/database";
import { getUserSettingsFromDb, saveUserSettingsToDb } from "@/services/database-service";

export async function saveUserSettings(input: { userId: string, settings: z.infer<typeof settingsSchema> }) {
  await saveUserSettingsToDb(input.userId, input.settings);
}

export async function getUserSettings(input: { userId: string }) {
  try {
    return await getUserSettingsFromDb(input.userId);
  } catch (error) {
    console.error('Failed to get user settings from DB:', error);
    // Return null or re-throw, but don't let it be an unhandled rejection.
    // For the purpose of the client-side call, returning null is safer.
    return null;
  }
}
