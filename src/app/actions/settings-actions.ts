
'use server';

import { z } from "zod";
import { settingsSchema, ReportTemplate, ScheduledTask, Machine } from "@/lib/types/database";
import { getUserSettingsFromDb, saveUserSettingsToDb, getReportTemplatesFromDb, getScheduledTasksFromDb, getMachinesFromDb } from "@/services/database-service";

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

export async function getReportTemplates(): Promise<ReportTemplate[]> {
    try {
        return await getReportTemplatesFromDb();
    } catch (error) {
        console.error('Failed to get report templates from DB:', error);
        return [];
    }
}

export async function getScheduledTasks(): Promise<ScheduledTask[]> {
    try {
        return await getScheduledTasksFromDb();
    } catch(error) {
        console.error('Failed to get scheduled tasks from DB:', error);
        return [];
    }
}

export async function getMachines(): Promise<Machine[]> {
    try {
        return await getMachinesFromDb();
    } catch(error) {
        console.error('Failed to get machines from DB:', error);
        return [];
    }
}
