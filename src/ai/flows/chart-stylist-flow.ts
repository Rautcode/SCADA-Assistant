
'use server';
/**
 * @fileOverview A Genkit flow for suggesting chart styles.
 *
 * - suggestChartStyle - A function that suggests a chart style based on a text prompt.
 * - ChartStyleSuggestion - The return type for the suggestChartStyle function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getUserSettingsFromDb } from '@/services/database-service';
import { getAuthenticatedUser } from '@genkit-ai/next/auth';


const ChartStyleSuggestionSchema = z.object({
  chartType: z.enum(['bar', 'line', 'pie']).describe("The suggested type of chart."),
  chartTitle: z.string().describe("A creative and descriptive title for the chart based on the user's prompt."),
  colorScheme: z.array(z.string().regex(/^#([0-9a-f]{3}){1,2}$/i)).length(5).describe("An array of 5 hexadecimal color codes for the chart."),
});

export type ChartStyleSuggestion = z.infer<typeof ChartStyleSuggestionSchema>;

// The input no longer contains the API key.
const SuggestChartStyleInputSchema = z.object({
    promptText: z.string(),
});
type SuggestChartStyleInput = z.infer<typeof SuggestChartStyleInputSchema>;


export async function suggestChartStyle(input: SuggestChartStyleInput): Promise<ChartStyleSuggestion> {
  return suggestChartStyleFlow(input);
}

const stylingPrompt = ai.definePrompt({
  name: 'chartStylingPrompt',
  input: { schema: z.string() },
  output: { schema: ChartStyleSuggestionSchema },
  prompt: `You are an expert data visualization designer. A user wants to style a chart and has provided the following prompt:

"{{prompt}}"

Based on this prompt, your task is to:
1.  Determine the best chart type ('bar', 'line', or 'pie').
2.  Create a concise, creative, and relevant title for the chart.
3.  Generate a harmonious color scheme of exactly 5 hexadecimal color codes.

Return your suggestions in the specified output format.`,
});

// This is now an AUTHENTICATED flow.
const suggestChartStyleFlow = ai.defineFlow(
  {
    name: 'suggestChartStyleFlow',
    inputSchema: SuggestChartStyleInputSchema,
    outputSchema: ChartStyleSuggestionSchema,
    auth: (auth) => {
        if (!auth) {
            throw new Error("User must be authenticated.");
        }
    }
  },
  async ({ promptText }) => {
    const auth = await getAuthenticatedUser();
     if (!auth) {
        throw new Error("User must be authenticated.");
    }
    
    // Securely get user settings from the database on the server.
    const userSettings = await getUserSettingsFromDb(auth.uid);
    if (!userSettings?.apiKey) {
        throw new Error("User API key is not configured.");
    }
    
    // Dynamically create a client with the user's API key.
    const dynamicClient = googleAI({ apiKey: userSettings.apiKey });
    
    const { output } = await ai.generate({
        prompt: stylingPrompt.prompt,
        model: dynamicClient.model('gemini-pro'), // Use the model from the dynamic client
        input: promptText,
        output: {
            schema: ChartStyleSuggestionSchema,
        },
    });
    
    if (!output) {
      throw new Error("AI failed to suggest a chart style.");
    }

    return output;
  }
);
