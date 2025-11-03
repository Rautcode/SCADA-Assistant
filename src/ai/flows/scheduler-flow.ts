
'use server';
/**
 * @fileOverview A Genkit flow for scheduling new tasks.
 */
import { ai } from '@/ai/genkit';
import { scheduleNewTaskInDb } from '@/services/database-service';
import { z } from 'genkit';

const NewTaskSchema = z.object({
    name: z.string().min(1, "Task name is required."),
    templateId: z.string().min(1, "A report template must be selected."),
    scheduledTime: z.string().describe("The scheduled time as an ISO string."),
});

type NewTask = z.infer<typeof NewTaskSchema>;

export async function scheduleNewTask(task: NewTask) {
    return scheduleNewTaskFlow(task);
}

const scheduleNewTaskFlow = ai.defineFlow(
    {
        name: 'scheduleNewTaskFlow',
        inputSchema: NewTaskSchema,
        outputSchema: z.void(),
    },
    async (task) => {
        // When a Date object is passed from the client to a server action/flow,
        // it gets serialized to an ISO string. We need to convert it back to a Date object.
        const taskWithDate = {
            ...task,
            scheduledTime: new Date(task.scheduledTime),
        };
        await scheduleNewTaskInDb(taskWithDate);
    }
);
