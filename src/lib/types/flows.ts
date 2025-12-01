
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

// Client-side schema for scheduling a task.
export const ScheduleTaskInputSchema = z.object({
  name: z.string().min(1, 'Task name is required.'),
  templateId: z.string().min(1, 'A report template must be selected.'),
  scheduledTime: z.string().describe('The scheduled time as an ISO string.'),
  recurring: z.enum(['none', 'daily', 'weekly', 'monthly']),
});
export type ScheduleTaskInput = z.infer<typeof ScheduleTaskInputSchema>;

// Settings flow input schema now uses a partial of the full settings schema,
// as the client might only send updated profile data.
export const UserSettingsFlowInput = settingsSchema.partial();
export const SettingsSchema = settingsSchema;
