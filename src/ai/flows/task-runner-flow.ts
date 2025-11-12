
'use server';
/**
 * @fileOverview A Genkit flow for running scheduled tasks.
 * This flow is designed to be triggered by an external scheduler (e.g., a cron job).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getDueTasks, getTemplateById, updateTaskStatus, getUserSettingsFromDb, getSystemSettingsFromDb } from '@/services/database-service';
import { generateReport, GenerateReportInputSchema } from './generate-report-flow';
import { sendEmail } from './send-email-flow';
import { getScadaData } from '@/app/actions/scada-actions';

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
        const template = await getTemplateById(task.templateId);
        
        if (!template) {
          throw new Error(`Template with ID ${task.templateId} not found.`);
        }
        
        // Scheduled tasks are associated with the 'system' user for settings
        const systemSettings = await getSystemSettingsFromDb();
        if (!systemSettings) {
          throw new Error("System settings are not configured. Cannot run scheduled tasks.");
        }

        const { apiKey, database: dbCreds, dataMapping, notifications } = systemSettings;
        
        if (!apiKey || !dbCreds || !dataMapping) {
            throw new Error("System settings for API key, database, or data mapping are incomplete.");
        }

        // Hardcode criteria for scheduled tasks for now. In a real app, this would be stored with the task.
        const criteria = {
            dateRange: { from: new Date(Date.now() - 24 * 60 * 60 * 1000), to: new Date() },
            machineIds: ['Machine-01', 'Machine-02'], // Example machine IDs
            reportType: template.category,
            parameterIds: [],
        };
        
        const scadaData = await getScadaData({ criteria, dbCreds, mapping: dataMapping });
        
        const reportInput = {
            criteria,
            template,
            scadaData,
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
            apiKey,
        } as z.infer<typeof GenerateReportInputSchema>;
        
        const reportResult = await generateReport(reportInput);

        // If email notifications are enabled for the system, send the report.
        if (notifications?.email) {
            await sendEmail({
                userId: 'system',
                to: systemSettings.email?.smtpUser || '', // Send to system admin email
                subject: `Scheduled Report: ${task.name}`,
                text: `Your scheduled report "${task.name}" is attached.`,
                html: `<p>Your scheduled report "<strong>${task.name}</strong>" is complete.</p><br/><pre>${reportResult.reportContent}</pre>`,
            });
        }
        
        await updateTaskStatus(task.id, 'completed');
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
