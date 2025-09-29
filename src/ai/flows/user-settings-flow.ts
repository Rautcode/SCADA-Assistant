
'use server';
/**
 * @fileOverview A Genkit flow for managing user settings.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getUserSettingsFromDb, saveUserSettingsToDb } from '@/services/database-service';
import { settingsSchema, type SettingsFormValues } from '@/lib/types/database';

const UserSettingsInputSchema = z.object({
  userId: z.string(),
  settings: settingsSchema,
});

const GetUserSettingsInputSchema = z.object({
    userId: z.string(),
});

export async function saveUserSettings(input: z.infer<typeof UserSettingsInputSchema>) {
  return saveUserSettingsFlow(input);
}

export async function getUserSettings(input: z.infer<typeof GetUserSettingsInputSchema>) {
  return getUserSettingsFlow(input);
}

const saveUserSettingsFlow = ai.defineFlow(
  {
    name: 'saveUserSettingsFlow',
    inputSchema: UserSettingsInputSchema,
    outputSchema: z.void(),
  },
  async ({ userId, settings }) => {
    await saveUserSettingsToDb(userId, settings);
  }
);

const getUserSettingsFlow = ai.defineFlow(
  {
    name: 'getUserSettingsFlow',
    inputSchema: GetUserSettingsInputSchema,
    outputSchema: settingsSchema.nullable(),
  },
  async ({ userId }) => {
    const settings = await getUserSettingsFromDb(userId);
    if (settings) {
        return settings;
    }
    return null;
  }
);
