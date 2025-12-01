
'use server';
/**
 * @fileOverview A Genkit flow for running scheduled tasks.
 * This flow is designed to be triggered by an external scheduler (e.g., a cron job).
 */

import { z } from 'zod';
import { getDueTasks, getTemplateById, updateTaskStatus, getUserSettingsFromDb, rescheduleTask } from '@/services/database-service';
import { generateReport } from './generate-report-flow';
import { sendEmail } from './send-email-flow';
import { reportCriteriaSchema } from '@/components/report-generator/step1-criteria';
import { chartConfigSchema } from '@/components/report-generator/step4-charts';
import { outputOptionsSchema } from '@/components/report-generator/step5-output';
import { ai } from '../genkit';
import { getScadaDataFlow } from './scada-flow';

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


// Input no longer contains the API key
const GenerateReportInputSchema = z.object({
  criteria: reportCriteriaSchema,
  template: ReportTemplateSchema,
  scadaData: z.array(ScadaDataPointSchema),
  chartOptions: chartConfigSchema,
  outputOptions: outputOptionsSchema,
});

export const runScheduledTasksFlow = ai.defineFlow(
  {
    name: 'runScheduledTasksFlow',
    inputSchema: z.void(),
    outputSchema: z.object({
      success: z.boolean(),
      processedTasks: z.number(),
      errors: z.array(z.string()),
    }),
  },
  async () => {
    console.log('Running scheduled tasks flow...');
    const dueTasks = await getDueTasks();
    
    if (dueTasks.length === 0) {
      console.log('No due tasks found.');
      return { success: true, processedTasks: 0, errors: [] };
    }

    console.log(`Found ${dueTasks.length} due tasks to process.`);
    const errors: string[] = [];
    let processedCount = 0;

    for (const task of dueTasks) {
      try {
        await updateTaskStatus(task.id, 'processing');
        
        const userSettings = await getUserSettingsFromDb(task.userId);
        if (!userSettings) {
          throw new Error(`Settings not found for user ${task.userId}. Cannot run task.`);
        }
        
        if (!userSettings.apiKey || !userSettings.database || !userSettings.dataMapping) {
            throw new Error(`User ${task.userId} has incomplete settings for API key, database, or data mapping.`);
        }
        
        const template = await getTemplateById(task.templateId);
        if (!template) {
          throw new Error(`Template with ID ${task.templateId} not found.`);
        }

        // Define criteria for the scheduled report. This could be made more flexible in the future.
        const criteria = {
            dateRange: { from: new Date(Date.now() - 24 * 60 * 60 * 1000), to: new Date() },
            machineIds: ['Machine-01', 'Machine-02'], // Example machine IDs, could be stored on the task in the future
            reportType: template.category,
            parameterIds: [],
        };
        
        // Use the centralized `getScadaDataFlow` with an auth override. This is the single data fetch.
        const scadaData = await getScadaDataFlow(
            { criteria },
            { authOverride: { uid: task.userId } }
        );
        
        const reportInput: z.infer<typeof GenerateReportInputSchema> = {
            criteria,
            template,
            scadaData, // Pass the fetched data directly
            chartOptions: { // Default chart options for scheduled reports
                includeCharts: true,
                chartType: 'bar',
                chartTitle: `${template.name} - ${new Date().toLocaleDateString()}`,
                xAxisField: 'machine',
                yAxisField: 'value'
            },
            outputOptions: { // Default output options
                format: 'pdf',
                fileName: `${task.name.replace(/\s/g, '_')}_${new Date().toISOString()}`
            },
        };
        
        // Call the generateReport flow with the already-fetched data.
        const reportResult = await generateReport(
            reportInput
        );

        // If email notifications are enabled for the user, send the report.
        if (userSettings.notifications?.email && userSettings.email?.smtpUser) {
            const emailResult = await sendEmail(
                {
                    to: userSettings.email.smtpUser,
                    subject: `Your Scheduled Report: "${task.name}"`,
                    text: `Attached is your automated report: ${task.name}.\n\n${reportResult.reportContent}`,
                    html: `<p>Attached is your automated report: <strong>${task.name}</strong>.</p><hr/><pre>${reportResult.reportContent}</pre>`,
                },
                // Securely provide the user's ID to use their settings
                { authOverride: { uid: task.userId } }
            );

            if (!emailResult.success) {
                // Log the email failure but don't fail the entire task
                console.error(`Scheduled task ${task.id} succeeded but failed to send email: ${emailResult.error}`);
            }
        }
        
        // Instead of setting to 'completed', we now reschedule it
        await rescheduleTask(task.id, task.scheduledTime, task.recurring);
        processedCount++;

      } catch (error: any) {
        console.error(`Failed to process task ${task.id}:`, error);
        await updateTaskStatus(task.id, 'failed', error.message);
        errors.push(`Task ${task.id} (${task.name}) failed: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      processedTasks: processedCount,
      errors,
    };
  }
);
