
'use server';
/**
 * @fileOverview A Genkit flow for the general purpose AI assistant.
 *
 * This file defines the behavior and tools for a conversational AI assistant
 * that can be used throughout the application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { onDashboardStats, onRecentActivities, onSystemComponentStatuses } from '@/services/database-service';
import type { DashboardStats, RecentActivity, SystemComponentStatus } from '@/lib/types/database';
import { Message, Part } from 'genkit';

// Define tools for the assistant to use
const navigationTool = ai.defineTool(
  {
    name: 'navigateTo',
    description: 'Navigates the user to a specific page within the application.',
    inputSchema: z.object({
      page: z.string().describe('The destination path, e.g., "/dashboard" or "/settings".'),
    }),
    outputSchema: z.string(),
  },
  async ({ page }) => `Navigating to ${page}...`
);

const getSystemStatusTool = ai.defineTool(
  {
    name: 'getSystemStatus',
    description: 'Retrieves the current status of all system components.',
    inputSchema: z.object({}),
    outputSchema: z.array(z.object({
      name: z.string(),
      status: z.string(),
    })),
  },
  async () => {
    return new Promise<SystemComponentStatus[]>((resolve) => {
        const unsubscribe = onSystemComponentStatuses((statuses: SystemComponentStatus[]) => {
            unsubscribe();
            resolve(statuses);
        });
    });
  }
);

const getDashboardStatsTool = ai.defineTool(
    {
        name: 'getDashboardStats',
        description: 'Retrieves the main overview statistics from the dashboard.',
        inputSchema: z.object({}),
        outputSchema: z.object({
            reports: z.number(),
            tasks: z.number(),
            users: z.number(),
            systemStatus: z.string(),
        }),
    },
    async () => {
        return new Promise<Omit<DashboardStats, 'lastUpdated'>>((resolve) => {
            const unsubscribe = onDashboardStats((stats: DashboardStats | null) => {
                if (stats) {
                    unsubscribe();
                    const { lastUpdated, ...rest } = stats;
                    resolve(rest);
                }
            });
        });
    }
);

const getRecentActivitiesTool = ai.defineTool(
    {
        name: 'getRecentActivities',
        description: 'Retrieves the most recent activities that have occurred in the system.',
        inputSchema: z.object({}),
        outputSchema: z.array(z.object({
            title: z.string(),
            description: z.string(),
            timestamp: z.date(),
        }))
    },
    async () => {
        return new Promise<Omit<RecentActivity, 'id'|'icon'|'iconColor'>[]>((resolve) => {
            const unsubscribe = onRecentActivities((activities: RecentActivity[]) => {
                unsubscribe();
                // Sanitize the data to only what the LLM needs, removing UI-specific fields
                resolve(activities.map(({id, icon, iconColor, ...rest}) => rest));
            }, 5); // get top 5
        });
    }
);


// Main prompt for the assistant
const assistantPrompt = ai.definePrompt({
  name: 'assistantPrompt',
  tools: [navigationTool, getSystemStatusTool, getDashboardStatsTool, getRecentActivitiesTool],
  system: `You are a helpful and knowledgeable AI assistant for a SCADA (Supervisory Control and Data Acquisition) application. 
  Your primary role is to provide excellent support by guiding users, answering questions about the system, and helping them troubleshoot issues.
  
  **Your Core Capabilities:**
  - **Navigation:** Help users find their way around the application.
  - **Data Retrieval:** Fetch real-time data about system status, dashboard statistics, and recent activities using your tools.
  - **Guidance & Troubleshooting:** Provide clear, step-by-step instructions and help users solve problems.

  **Application Pages & Their Functions:**
  - **/dashboard**: The main overview page. Shows key metrics and system health at a glance.
  - **/report-generator**: A multi-step wizard to create custom reports from SCADA data.
  - **/templates**: Lets users manage predefined report templates. They can create new ones or browse existing designs.
  - **/scheduler**: Allows for the automation of tasks, like generating a report at a specific time.
  - **/settings**: The central hub for all configurations. This includes database credentials, data mappings, email settings, and app appearance.
  - **/profile**: Where users can update their personal information like their display name.
  - **/wincc-activity-logger**: A detailed, real-time feed of all system and user activities.
  - **/logs-errors**: A crucial page for troubleshooting. It displays system logs and error messages.
  - **/help**: General documentation and support information.

  **How to Interact:**
  - **Be Conversational & Proactive:** Don't just wait for commands. If a user asks for data, offer to take them to the relevant page for a more detailed view.
  - **Use Your Tools:** When a user's query matches a tool's description, use it. For instance:
    - "What's the system status?" -> Use \`getSystemStatus\`.
    - "Show me dashboard stats." -> Use \`getDashboardStats\`.
    - "What just happened?" -> Use \`getRecentActivities\`.
    - "Go to settings." -> Use \`navigateTo\`.
  - **Summarize Tool Output:** When a tool returns data, present it in a clear, human-readable summary. Don't just dump the raw data.
  - **Error Handling & Troubleshooting:** If a user mentions an error or a problem:
    1.  Acknowledge their frustration (e.g., "I'm sorry to hear you're running into an issue.").
    2.  Ask for specific details about the error message or what they were doing.
    3.  Suggest a first step. A great first step is always to check the **/logs-errors** page for detailed messages.
    4.  If it sounds like a data or connection issue, suggest they verify their configuration on the **/settings** page.
  
  Always strive to be the most helpful and capable assistant possible. Your goal is to make the user's experience smooth and efficient.`,
  config: {
    multiTurn: true,
  },
});

export async function askAssistant(history: {role: 'user' | 'model', content: Part[]}[]) {
    const response = await assistantPrompt({
        messages: history.map(h => new Message(h.role, h.content))
    });

    return response;
}
