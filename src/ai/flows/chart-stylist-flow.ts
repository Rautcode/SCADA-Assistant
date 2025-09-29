
'use server';
/**
 * @fileOverview A Genkit flow for suggesting chart styles.
 *
 * - suggestChartStyle - A function that suggests a chart style based on a text prompt.
 * - ChartStyleSuggestion - The return type for the suggestChartStyle function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChartStyleSuggestionSchema = z.object({
  chartType: z.enum(['bar', 'line', 'pie']).describe("The suggested type of chart."),
  chartTitle: z.string().describe("A creative and descriptive title for the chart based on the user's prompt."),
  colorScheme: z.array(z.string().regex(/^#([0-9a-f]{3}){1,2}$/i)).length(5).describe("An array of 5 hexadecimal color codes for the chart."),
});

export type ChartStyleSuggestion = z.infer<typeof ChartStyleSuggestionSchema>;

export async function suggestChartStyle(promptText: string): Promise<ChartStyleSuggestion> {
  return suggestChartStyleFlow(promptText);
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

const suggestChartStyleFlow = ai.defineFlow(
  {
    name: 'suggestChartStyleFlow',
    inputSchema: z.string(),
    outputSchema: ChartStyleSuggestionSchema,
  },
  async (promptText) => {
    const { output } = await stylingPrompt(promptText);
    
    if (!output) {
      throw new Error("AI failed to suggest a chart style.");
    }

    return output;
  }
);
