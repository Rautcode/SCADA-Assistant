
'use server';
/**
 * @fileOverview A secure, robust Genkit flow for sending emails.
 * It can be called by an authenticated user from the client, or by another
 * trusted backend flow (like the task runner) with an auth override.
 */

import { z } from 'zod';
import * as nodemailer from 'nodemailer';
import { addEmailLogToDb, getUserSettingsFromDb, getSystemSettingsFromDb } from '@/services/database-service';
import { emailSettingsSchema } from '@/lib/types/database';
import { SendEmailInput } from '@/lib/types/flows';
import { getAuthenticatedUser } from '@genkit-ai/next/auth';
import { defineFlow } from 'genkit/flow';


// Define an options object for the flow to allow for auth override from backend flows.
const SendEmailFlowOptionsSchema = z.object({
  authOverride: z.object({ uid: z.string() }).optional(),
});


// This is the primary email sending flow for the entire application.
export const sendEmail = defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInput,
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
    // The second argument to a flow is an options object.
  },
  async (input, flowOptions) => {
    const { to, subject, text, html } = input;
    
    // Parse the flow options to check for an auth override.
    const options = SendEmailFlowOptionsSchema.parse(flowOptions || {});

    let userId: string;

    if (options.authOverride) {
      // If an auth override is provided, this flow is being called by a trusted backend service.
      // We use the provided UID (e.g., 'system' or a user's ID for a scheduled task).
      userId = options.authOverride.uid;
      console.log(`sendEmailFlow running with auth override for user: ${userId}`);
    } else {
      // If no override, this is a standard client-side request.
      // We securely get the authenticated user's ID.
      const auth = await getAuthenticatedUser();
      if (!auth) {
        return { success: false, error: "User is not authenticated." };
      }
      userId = auth.uid;
    }

    let smtpSettings: z.infer<typeof emailSettingsSchema> | undefined | null;
    let notificationEnabled = true;
    let fromAddress: string;
    
    // The settings object now nests all config under a 'settings' property.
    // Fetch the correct settings object based on userId.
    const settingsContainer = userId === 'system' 
        ? await getSystemSettingsFromDb() 
        : await getUserSettingsFromDb(userId);

    if (!settingsContainer) {
        const errorMsg = `Settings not found for user '${userId}'. Cannot send email.`;
        console.error(errorMsg);
        await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
        return { success: false, error: "Could not retrieve user settings." };
    }

    smtpSettings = settingsContainer.email;
    notificationEnabled = settingsContainer.notifications?.email ?? false;

    // Use a default from address if none is configured
    fromAddress = `SCADA Assistant <${smtpSettings?.smtpUser || 'noreply@scada.local'}>`;
    
    if (!notificationEnabled) {
        const skipMsg = `Email notifications are disabled for user ${userId}. Skipping email to ${to}.`;
        console.log(skipMsg);
        // Do not log this as a failure in the DB, it's intended behavior.
        return { success: true, error: "Skipped: Email notifications are disabled by the user." };
    }
    
    if (!smtpSettings?.smtpHost || !smtpSettings?.smtpPort || !smtpSettings.smtpUser) {
      const errorMsg = `SMTP settings are not configured for user '${userId}'. Cannot send email.`;
      console.error(errorMsg);
      await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
      const clientError = userId === 'system' 
        ? "System email notifications are not configured."
        : "Your SMTP settings are not configured. Please configure them in Settings.";
      return { success: false, error: clientError };
    }

    const transporter = nodemailer.createTransport({
      host: smtpSettings.smtpHost,
      port: smtpSettings.smtpPort,
      secure: smtpSettings.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpSettings.smtpUser,
        pass: smtpSettings.smtpPass,
      },
       tls: {
          rejectUnauthorized: true
      }
    });

    try {
      await transporter.verify();
    } catch (error: any) {
      const errorMsg = `SMTP server verification failed for user ${userId}: ` + error.message;
      console.error(errorMsg);
      await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
      return { success: false, error: 'SMTP server verification failed. Check your credentials in Settings.' };
    }

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: to,
        subject: subject,
        text: text,
        html: html,
      });

      console.log('Email sent successfully:', info.messageId);
      await addEmailLogToDb({ to, subject, status: 'sent' });
      return { success: true };

    } catch (error: any) {
      const errorMsg = 'Failed to send email: ' + error.message;
      console.error(errorMsg);
      await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
      return { success: false, error: "Failed to send email. Check SMTP server logs for details." };
    }
  }
);

    