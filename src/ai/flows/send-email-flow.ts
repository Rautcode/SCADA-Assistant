
'use server';
/**
 * @fileOverview A secure, robust, and AUTHENTICATED Genkit flow for sending emails.
 * It can be called by an authenticated user from the client, or by another
 * trusted backend flow (like the task runner) with an auth override.
 */

import { z } from 'zod';
import * as nodemailer from 'nodemailer';
import { addEmailLogToDb, getUserSettingsFromDb, getSystemSettingsFromDb } from '@/services/database-service';
import { emailSettingsSchema } from '@/lib/types/database';
import { SendEmailInput } from '@/lib/types/flows';
import { ai } from '../genkit';
import { getAuthenticatedUser } from '@genkit-ai/next/auth';


// Define an options object for the flow to allow for auth override from backend flows.
const SendEmailFlowOptionsSchema = z.object({
  authOverride: z.object({ uid: z.string() }).optional(),
});


// This is the primary email sending flow for the entire application.
// It is now an AUTHENTICATED flow, preventing anonymous access.
export const sendEmail = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInput,
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
    auth: (auth) => {
        // Allow if auth is present OR if an authOverride will be provided in flowOptions
        // The logic inside the flow will handle the final check.
    }
  },
  async (input, { flowOptions }) => {
    const { to, subject, text, html } = input;
    
    // Parse the flow options to check for an auth override.
    const options = SendEmailFlowOptionsSchema.parse(flowOptions || {});

    let userId: string;

    if (options.authOverride) {
      // If an auth override is provided, this flow is being called by a trusted backend service.
      // We use the provided UID (e.g., a user's ID for a scheduled task).
      userId = options.authOverride.uid;
      console.log(`sendEmailFlow running with auth override for user: ${userId}`);
    } else {
      // If no override, this is a standard client-side request.
      // We securely get the authenticated user's ID from the context.
      const auth = await getAuthenticatedUser();
      if (!auth) {
          throw new Error("User must be authenticated and no auth override was provided.");
      }
      userId = auth.uid;
    }

    let smtpSettings: z.infer<typeof emailSettingsSchema> | undefined | null;
    let notificationEnabled = true;
    let fromAddress: string;
    
    const userSettings = await getUserSettingsFromDb(userId);

    if (!userSettings) {
        const errorMsg = `Settings not found for user '${userId}'. Cannot send email.`;
        console.error(errorMsg);
        await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
        return { success: false, error: "Could not retrieve user settings." };
    }

    // Correctly access nested settings
    smtpSettings = userSettings.email;
    notificationEnabled = userSettings.notifications?.email ?? false;

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
      const clientError = "Your SMTP settings are not configured. Please configure them in Settings.";
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
