
import { z } from 'zod';
import { settingsSchema } from './database';

export const SendEmailInput = z.object({
  to: z.string().email(),
  subject: z.string(),
  text: z.string(),
  html: z.string(),
});
export type SendEmailInput = z.infer<typeof SendEmailInput>;


export const AuthEmailInput = z.object({
  to: z.string().email(),
  subject: z.string(),
  text: z.string(),
  html: z.string(),
});
export type AuthEmailInput = z.infer<typeof AuthEmailInput>;

// Schema for client-side input for scheduling a task.
export const ScheduleTaskInputSchema = z.object({
  name: z.string().min(1, 'Task name is required.'),
  templateId: z.string().min(1, 'A report template must be selected.'),
  scheduledTime: z.string().describe('The scheduled time as an ISO string.'),
  recurring: z.enum(['none', 'daily', 'weekly', 'monthly']),
});
export type ScheduleTaskInput = z.infer<typeof ScheduleTaskInputSchema>;

// Schemas for settings flows
export const UserSettingsFlowInput = settingsSchema;
export const SettingsSchema = settingsSchema;
