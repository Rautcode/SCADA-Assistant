
'use server';
/**
 * @fileOverview A Genkit flow for generating reports from SCADA data.
 *
 * - generateReport - A function that orchestrates the report generation and optional emailing.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { reportCriteriaSchema } from '@/components/report-generator/step1-criteria';
import { chartConfigSchema } from '@/components/report-generator/step4-charts';
import { outputOptionsSchema } from '@/components/report-generator/step5-output';
import { format } from 'date-fns';
import { googleAI } from '@genkit-ai/googleai';
import { sendEmail } from './send-email-flow';
import { getAuthenticatedUser } from '@genkit-ai/next/auth';

// Helper schemas for complex types
const ScadaDataPointSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  machine: z.string(),
  parameter: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string(),
  included: z.boolean().optional(),
});

const ReportTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    thumbnailUrl: z.string(),
    lastModified: z.date(),
});


const GenerateReportInputSchema = z.object({
  criteria: reportCriteriaSchema,
  template: ReportTemplateSchema,
  scadaData: z.array(ScadaDataPointSchema),
  chartOptions: chartConfigSchema,
  outputOptions: outputOptionsSchema,
  apiKey: z.string(), // API key is now mandatory
});
type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;


const GenerateReportOutputSchema = z.object({
  reportContent: z.string().describe("The full content of the generated report in the requested format (e.g., Markdown for PDF, or a raw CSV string)."),
  fileName: z.string().describe("The suggested file name for the report."),
  format: z.enum(['pdf', 'csv']).describe("The format of the generated report content."),
});
type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;


export async function generateReport(input: GenerateReportInput): Promise<GenerateReportOutput> {
  return generateReportFlow(input);
}

const reportGenerationPrompt = ai.definePrompt({
  name: 'generateReportPrompt',
  // The input schema for the prompt itself can be simpler, using strings for dates
  input: { schema: z.any() }, 
  output: { schema: GenerateReportOutputSchema },
  prompt: `
    You are an expert SCADA System Analyst and technical writer. Your task is to generate a highly structured and professional report based on the provided criteria, data, and output format.

    **Output Format Instructions:**
    - If the requested format is 'csv', generate ONLY a valid CSV string of the provided SCADA data. The first line must be the header row: "Timestamp,Machine,Parameter,Value,Unit". Each subsequent line should be a data point. Do not include any other text or explanation.
    - If the requested format is 'pdf', generate a comprehensive report in structured Markdown format. The report MUST include the following sections in this exact order:

    # {{outputOptions.fileName}}
    *Report for the period: {{criteria.dateRange.from}} to {{criteria.dateRange.to}}*

    ---

    ## Report Parameters
    - **Template Used**: "{{template.name}}" ({{template.category}})
    - **Template's Purpose**: *{{template.description}}*
    - **Machines Analyzed**: {{#each criteria.machineIds}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
    - **Parameters/Tags Included**: {{#if criteria.parameterIds}}{{#each criteria.parameterIds}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}All available{{/if}}
    - **Total Data Points Analyzed**: {{scadaData.length}}

    ---

    ## Executive Summary
    **Your analysis MUST be guided by the Template's Purpose.**
    - Write a high-level summary of the key findings from the data.
    - Identify important trends, anomalies, or significant metrics.
    - For 'Production' reports, focus on output and efficiency.
    - For 'Maintenance' or 'Downtime' reports, focus on errors, stoppages, and failure rates.
    - For 'Quality' reports, focus on deviations from standards and consistency.

    ---

    ## Chart Analysis
    - **Chart Type**: {{chartOptions.chartType}}
    - **Description**: Briefly explain what the chart ("{{chartOptions.chartTitle}}") represents and what conclusions can be drawn from it.

    ---

    ## Raw Data
    | Timestamp | Machine | Parameter | Value | Unit |
    |---|---|---|---|---|
    {{#each scadaData}}
    | {{timestamp}} | {{machine}} | {{parameter}} | {{value}} | {{unit}} |
    {{/each}}

    **End of Report.**
  `,
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: GenerateReportOutputSchema,
  },
  async (input) => {
    console.log('Backend flow started with input:', input);
    
    // Securely get authenticated user
    const auth = await getAuthenticatedUser();
    if (!auth) {
        throw new Error("User must be authenticated to generate a report.");
    }
    const userId = auth.uid;

    const { apiKey, outputOptions, ...restOfInput } = input;
    
    // **PRE-PROCESSING STEP:** Convert all date objects to simple strings for the prompt
    const promptInput = {
      ...restOfInput,
      outputOptions,
      criteria: {
        ...restOfInput.criteria,
        dateRange: {
          from: format(new Date(restOfInput.criteria.dateRange.from), 'yyyy-MM-dd'),
          to: format(new Date(restOfInput.criteria.dateRange.to), 'yyyy-MM-dd'),
        },
      },
      scadaData: restOfInput.scadaData.map(d => ({
        ...d,
        timestamp: format(new Date(d.timestamp), 'yyyy-MM-dd HH:mm:ss')
      })),
      template: {
        ...restOfInput.template,
        lastModified: format(new Date(restOfInput.template.lastModified), 'yyyy-MM-dd'),
      }
    };
    
    // Dynamically create a client with the user's API key
    const dynamicClient = googleAI({ apiKey });

    const { output } = await ai.generate({
      prompt: reportGenerationPrompt.prompt,
      model: dynamicClient.model('gemini-pro'), // Use model from dynamic client
      input: promptInput,
      output: { schema: GenerateReportOutputSchema },
    });
    
    if (!output) {
        throw new Error("The AI model failed to generate a report. It returned no output.");
    }
    
    // Ensure the filename has the correct extension
    if (output.format === 'pdf' && !output.fileName.endsWith('.md')) {
      output.fileName += '.md';
    } else if (output.format === 'csv' && !output.fileName.endsWith('.csv')) {
      output.fileName += '.csv';
    }

    // After generating, check if email needs to be sent
    if (outputOptions.emailImmediately && outputOptions.recipients) {
        console.log(`Sending report via email to: ${outputOptions.recipients}`);
        
        const subject = `SCADA Report: ${outputOptions.fileName}`;
        const defaultMessage = "Please find the attached SCADA report, generated by the SCADA Assistant.";
        const bodyText = outputOptions.emailMessage || defaultMessage;
        
        // Convert Markdown to basic HTML for email
        const bodyHtml = `<p>${(outputOptions.emailMessage || defaultMessage).replace(/\n/g, '<br>')}</p><hr/><pre>${output.reportContent}</pre>`;

        // Split recipients by comma and trim whitespace
        const toEmails = outputOptions.recipients.split(',').map(e => e.trim()).filter(e => e);

        for (const email of toEmails) {
            await sendEmail(
                {
                    to: email,
                    subject: subject,
                    text: `${bodyText}\n\n${output.reportContent}`,
                    html: bodyHtml,
                },
                // Securely provide the user's ID to use their settings
                { authOverride: { uid: userId } }
            );
        }
    }


    console.log('Backend flow completed successfully.');
    return output;
  }
);
