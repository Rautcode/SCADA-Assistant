
'use server';
/**
 * @fileOverview An unauthenticated Genkit flow for sending system-level emails (e.g., password reset).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as nodemailer from 'nodemailer';
import { addEmailLogToDb, getSystemSettingsFromDb } from '@/services/database-service';
import { AuthEmailInput } from '@/lib/types/flows';

// This is an UNAUTHENTICATED flow. It should only be used for system-level actions
// like password resets where the user is not logged in.
// It can ONLY use system-wide settings.
export const sendAuthEmail = ai.defineFlow(
  {
    name: 'sendAuthEmailFlow',
    inputSchema: AuthEmailInput,
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  async ({ to, subject, text, html }) => {
    
    // System-level emails (like password resets) use system-wide settings.
    const systemSettings = await getSystemSettingsFromDb();
    const smtpSettings = systemSettings?.email;
    
    if (!smtpSettings?.smtpHost || !smtpSettings?.smtpPort || !smtpSettings.smtpUser) {
      const errorMsg = `System SMTP settings are not configured. Cannot send auth email.`;
      console.error(errorMsg);
      await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
      return { success: false, error: "System email notifications are not configured." };
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
    } catch (error: any) {
      const errorMsg = 'System SMTP server verification failed: ' + error.message;
      console.error(errorMsg);
      await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
      return { success: false, error: 'System SMTP server verification failed. Check global settings.' };
    }

    try {
      const info = await transporter.sendMail({
        from: `SCADA Assistant <${smtpSettings.smtpUser}>`,
        to: to,
        subject: subject,
        text: text,
        html: html,
      });

      console.log('Auth email sent successfully:', info.messageId);
      await addEmailLogToDb({ to, subject, status: 'sent' });
      return { success: true };

    } catch (error: any) {
      const errorMsg = 'Failed to send auth email: ' + error.message;
      console.error(errorMsg);
      await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
      return { success: false, error: "Failed to send system email." };
    }
  }
);
