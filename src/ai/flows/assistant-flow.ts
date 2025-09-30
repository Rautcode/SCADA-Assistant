
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
  system: `You are a helpful AI assistant for a SCADA (Supervisory Control and Data Acquisition) application.
  Your role is to help users understand the application's features, navigate through it, and get real-time information about the system's status and data.
  
  Available pages:
  - /dashboard: The main overview page.
  - /report-generator: A tool to create new reports.
  - /templates: Manage report templates.
  - /scheduler: Schedule automated tasks.
  - /settings: Configure application and database settings.
  - /profile: View and edit user profile.
  - /help: Documentation and support.
  
  When a user asks to go to a page, use the navigateTo tool.
  When a user asks about system status, dashboard stats, or recent activity, use the provided tools to get live data.
  Summarize the data from tools in a clear, human-readable way. For example, when reporting system status, list each component and its status.
  
  Keep your answers concise and helpful. Be friendly and conversational.`,
});

export async function askAssistant(history: z.infer<typeof assistantPrompt.historySchema>) {
  const result = await assistantPrompt.run({ history });
  return result;
}
