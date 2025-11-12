
'use server';

import { z } from "zod";
import { scheduleNewTaskInDb } from "@/services/database-service";

const NewTaskSchema = z.object({
    name: z.string().min(1, "Task name is required."),
    templateId: z.string().min(1, "A report template must be selected."),
    scheduledTime: z.string().describe("The scheduled time as an ISO string."),
    userId: z.string().min(1, "User ID is required."), // Added userId
});

type NewTask = z.infer<typeof NewTaskSchema>;

/**
 * Server action to schedule a new task.
 * @param task - The new task details from the client.
 */
export async function scheduleNewTask(task: NewTask) {
    // When a Date object is passed from the client to a server action,
    // it gets serialized to an ISO string. We need to convert it back to a Date object
    // before saving it to Firestore, which expects a Date object to convert to a Timestamp.
    const taskWithDate = {
        ...task,
        scheduledTime: new Date(task.scheduledTime),
    };

    // The Zod schema on the server action validates the incoming client data.
    // Now we can safely call the database service.
    await scheduleNewTaskInDb(taskWithDate);
}
