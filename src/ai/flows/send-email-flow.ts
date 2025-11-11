
'use server';
/**
 * @fileOverview A Genkit flow for sending emails.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as nodemailer from 'nodemailer';
import { addEmailLogToDb, getUserSettingsFromDb, getSystemSettingsFromDb } from '@/services/database-service';
import { emailSettingsSchema } from '@/lib/types/database';

const SendEmailInputSchema = z.object({
  userId: z.string(), // To fetch user-specific or system-wide SMTP settings. Use 'system' for global.
  to: z.string().email(),
  subject: z.string(),
  text: z.string(),
  html: z.string(),
});
type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export async function sendEmail(input: SendEmailInput) {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  async ({ userId, to, subject, text, html }) => {
    
    let smtpSettings: z.infer<typeof emailSettingsSchema> | undefined | null;
    let notificationEnabled = true;

    if (userId === 'system') {
        // System-level emails (like password resets) use system-wide settings.
        const systemSettings = await getSystemSettingsFromDb();
        smtpSettings = systemSettings?.email;
        // System emails are always "enabled" from a notification standpoint.
    } else {
        // User-specific emails respect the user's notification preferences.
        const userSettings = await getUserSettingsFromDb(userId);
        smtpSettings = userSettings?.email;
        notificationEnabled = userSettings?.notifications?.email ?? false;
    }
    
    if (!notificationEnabled) {
        const skipMsg = `Email notifications are disabled for user ${userId}. Skipping email to ${to}.`;
        console.log(skipMsg);
        // Do not log this as a failure in the DB, it's intended behavior.
        return { success: true, error: "Skipped: Email notifications are disabled by the user." };
    }
    
    if (!smtpSettings?.smtpHost || !smtpSettings?.smtpPort || !smtpSettings.smtpUser) {
      const errorMsg = `SMTP settings are not configured for '${userId}'. Cannot send email.`;
      console.error(errorMsg);
      await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
      const clientError = userId === 'system' 
        ? "Skipped: System email notifications are not configured."
        : "SMTP settings are not configured. Please configure them in Settings.";
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
      return { success: false, error: errorMsg };
    }
  }
);
