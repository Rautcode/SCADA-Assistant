
'use server';
/**
 * @fileOverview A secure, authenticated Genkit flow for scheduling new tasks.
 */

import { z } from 'zod';
import { ai } from '../genkit';
import { scheduleNewTaskInDb } from '@/services/database-service';
import { getAuthenticatedUser } from '@genkit-ai/next/auth';

// Schema for client-side input. It does not include userId.
const ScheduleTaskInputSchema = z.object({
  name: z.string().min(1, 'Task name is required.'),
  templateId: z.string().min(1, 'A report template must be selected.'),
  scheduledTime: z.string().describe('The scheduled time as an ISO string.'),
});
export type ScheduleTaskInput = z.infer<typeof ScheduleTaskInputSchema>;

// Export a client-callable wrapper function
export async function scheduleTask(input: ScheduleTaskInput): Promise<void> {
  return scheduleTaskFlow(input);
}

// This is an AUTHENTICATED flow.
// It uses the secure `auth` context to get the user's ID.
export const scheduleTaskFlow = ai.defineFlow(
  {
    name: 'scheduleTaskFlow',
    inputSchema: ScheduleTaskInputSchema,
    outputSchema: z.void(),
    auth: (auth) => {
        if (!auth) {
            throw new Error("User must be authenticated.");
        }
    }
  },
  async (input) => {
    // The userId is from the secure, verified `auth` context, not from client input.
    const auth = await getAuthenticatedUser();
    if (!auth) {
        throw new Error("User must be authenticated.");
    }
    const userId = auth.uid;

    const taskWithUser = {
      ...input,
      scheduledTime: new Date(input.scheduledTime),
      userId: userId,
    };

    // Call the database service with the securely obtained userId.
    await scheduleNewTaskInDb(taskWithUser);
  }
);
