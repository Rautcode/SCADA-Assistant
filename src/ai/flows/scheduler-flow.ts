
'use server';
/**
 * @fileOverview A secure, authenticated Genkit flow for scheduling new tasks.
 */

import { z } from 'zod';
import { ai } from '../genkit';
import { scheduleNewTaskInDb } from '@/services/database-service';
import { ScheduleTaskInputSchema, type ScheduleTaskInput } from '@/lib/types/flows';

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
  },
  async (input, { auth }) => {
    // The userId is from the secure, verified `auth` context, not from client input.
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
