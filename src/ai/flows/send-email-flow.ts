
'use server';
/**
 * @fileOverview A Genkit flow for sending emails.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as nodemailer from 'nodemailer';
import { addEmailLogToDb } from '@/services/database-service';
import { emailSettingsSchema } from '@/lib/types/database';

export const SendEmailInputSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  text: z.string(),
  html: z.string(),
  smtpSettings: emailSettingsSchema,
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
  async ({ to, subject, text, html, smtpSettings }) => {
    
    if (!smtpSettings.smtpHost || !smtpSettings.smtpPort) {
      const errorMsg = "SMTP settings are not configured.";
      console.error(errorMsg);
      await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
      return { success: false, error: errorMsg };
    }

    const transporter = nodemailer.createTransport({
      host: smtpSettings.smtpHost,
      port: smtpSettings.smtpPort,
      secure: smtpSettings.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpSettings.smtpUser,
        pass: smtpSettings.smtpPass,
      },
    });

    try {
      await transporter.verify();
      console.log('SMTP server connection verified.');
    } catch (error: any) {
      console.error('SMTP server verification failed:', error.message);
      await addEmailLogToDb({ to, subject, status: 'failed', error: 'SMTP server verification failed: ' + error.message });
      return { success: false, error: 'SMTP server verification failed. Check your credentials.' };
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
      console.error('Failed to send email:', error.message);
      await addEmailLogToDb({ to, subject, status: 'failed', error: error.message });
      return { success: false, error: 'Failed to send email: ' + error.message };
    }
  }
);
