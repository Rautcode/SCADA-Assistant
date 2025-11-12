
'use server';
/**
 * @fileOverview A Genkit flow for sending emails on behalf of an authenticated user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as nodemailer from 'nodemailer';
import { addEmailLogToDb, getUserSettingsFromDb } from '@/services/database-service';
import { emailSettingsSchema } from '@/lib/types/database';
import { SendEmailInput } from '@/lib/types/flows';
import { defineAuthenticatedFlow } from '@genkit-ai/next/auth';

// This is an AUTHENTICATED flow. Genkit will verify the user's Firebase token.
// The `auth` object is populated by the framework and can be trusted.
export const sendEmail = defineAuthenticatedFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInput,
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  async (input, { auth }) => {
    const { to, subject, text, html } = input;
    
    // The user's ID is from the secure, verified `auth` context, not the client input.
    const userId = auth.uid;

    let smtpSettings: z.infer<typeof emailSettingsSchema> | undefined | null;
    let notificationEnabled = true;

    // User-specific emails respect the user's notification preferences.
    const userSettings = await getUserSettingsFromDb(userId);
    smtpSettings = userSettings?.email;
    notificationEnabled = userSettings?.notifications?.email ?? false;
    
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
      const clientError = "SMTP settings are not configured. Please configure them in Settings.";
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
          // Do not allow self-signed certificates
          rejectUnauthorized: true
      }
    });

    try {
      await transporter.verify();
      console.log('SMTP server connection verified for:', userId);
    } catch (error: any) {
      const errorMsg = 'SMTP server verification failed: ' + error.message;
      console.error(errorMsg);
      await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
      return { success: false, error: 'SMTP server verification failed. Check your credentials in Settings.' };
    }

    try {
      const info = await transporter.sendMail({
        from: `SCADA Assistant <${smtpSettings.smtpUser}>`,
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
