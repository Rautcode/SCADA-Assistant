
'use server';
/**
 * @fileOverview A Genkit flow for generating reports from SCADA data.
 *
 * - generateReport - A function that orchestrates the report generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { reportCriteriaSchema } from '@/components/report-generator/step1-criteria';
import { chartConfigSchema } from '@/components/report-generator/step4-charts';
import { outputOptionsSchema } from '@/components/report-generator/step5-output';


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
  input: { schema: GenerateReportInputSchema },
  output: { schema: GenerateReportOutputSchema },
  prompt: `
    You are a SCADA System Report Generation Assistant. Your task is to generate a report based on the provided criteria, data, and output format.

    **Report Details:**
    - **Report Name:** {{outputOptions.fileName}}
    - **Template Used:** "{{template.name}}" ({{template.description}})
    - **Date Range:** {{criteria.dateRange.from}} to {{criteria.dateRange.to}}
    - **Machines:** {{#each criteria.machineIds}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
    - **Parameters/Tags:** {{#if criteria.parameterIds}}{{#each criteria.parameterIds}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}All available{{/if}}

    **Data Summary:**
    - Total Data Points Received: {{scadaData.length}}

    **Instructions:**
    1.  **Analyze the Data**: Review the provided SCADA data points.
    2.  **Summarize Key Findings**: Create a high-level summary of the data. Identify trends, anomalies, or important metrics based on the report type '{{criteria.reportType}}'. For 'production_summary', focus on output. For 'downtime_analysis', focus on errors or stoppages. For 'quality_metrics', focus on deviations.
    3.  **Format the Output**: 
        - If the requested format is 'csv', generate ONLY a valid CSV string of the provided SCADA data. The first line must be the header row: "Timestamp,Machine,Parameter,Value,Unit".
        - If the requested format is 'pdf', generate a comprehensive report in Markdown format. The report should include:
            - A main title.
            - The summary of key findings.
            - A section for charts (if requested): Mention the chart type ({{chartOptions.chartType}}) and what it represents.
            - A data table of the raw data.
    4.  **Populate Output Schema**: Fill the 'reportContent', 'fileName', and 'format' fields in the output object.

    **Raw SCADA Data:**
    {{#each scadaData}}
    - {{timestamp}}: {{machine}}, {{parameter}} = {{value}} {{unit}}
    {{/each}}
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
    
    const { output } = await reportGenerationPrompt(input);
    
    if (!output) {
        throw new Error("AI model failed to generate a report.");
    }
    
    console.log('Backend flow completed successfully.');
    return output;
  }
);
