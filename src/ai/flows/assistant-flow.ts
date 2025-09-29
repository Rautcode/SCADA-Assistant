
'use server';
/**
 * @fileOverview A Genkit flow for the general purpose AI assistant.
 *
 * This file defines the behavior and tools for a conversational AI assistant
 * that can be used throughout the application.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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

// Main prompt for the assistant
const assistantPrompt = ai.definePrompt({
  name: 'assistantPrompt',
  tools: [navigationTool],
  system: `You are a helpful AI assistant for a SCADA (Supervisory Control and Data Acquisition) application.
  Your role is to help users understand the application's features and navigate through it.
  
  Available pages:
  - /dashboard: The main overview page.
  - /report-generator: A tool to create new reports.
  - /templates: Manage report templates.
  - /scheduler: Schedule automated tasks.
  - /settings: Configure application and database settings.
  - /profile: View and edit user profile.
  - /help: Documentation and support.
  
  When a user asks to go to a page, use the navigateTo tool.
  Keep your answers concise and helpful.`,
});

export async function askAssistant(history: z.infer<typeof assistantPrompt.historySchema>) {
  const result = await assistantPrompt.run({ history });
  return result;
}
