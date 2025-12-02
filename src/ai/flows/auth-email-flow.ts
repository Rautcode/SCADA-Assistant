
'use server';
/**
 * @fileOverview An unauthenticated Genkit flow for sending system-level emails (e.g., password reset).
 * This flow is isolated and can only use system-level email settings.
 */

import { z } from 'zod';
import * as nodemailer from 'nodemailer';
import { AuthEmailInput } from '@/lib/types/flows';
import { addEmailLogToDb, getSystemSettingsFromDb } from '@/services/database-service';
import { ai } from '../genkit';
import { getPasswordResetEmailHtml, getPasswordResetEmailText } from '@/components/emails/password-reset-template';

// This is an UNAUTHENTICATED flow. It should only be used for system-level actions
// like password resets where the user is not logged in.
// It contains its own isolated email-sending logic and CANNOT be used as an open relay.
export const sendAuthEmail = ai.defineFlow(
  {
    name: 'sendAuthEmailFlow',
    inputSchema: AuthEmailInput,
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  async (input) => {
    // The `html` and `text` from the client now contain the password reset link.
    const { to, subject, html: resetLink } = input;
    const userId = 'system'; // This flow always operates as the system.

    const systemSettings = await getSystemSettingsFromDb();

    if (!systemSettings) {
        const errorMsg = `System settings not found. Cannot send auth email.`;
        console.error(errorMsg);
        await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
        return { success: false, error: "Could not retrieve system settings." };
    }

    const smtpSettings = systemSettings.email;
    const fromAddress = `SCADA Assistant <${smtpSettings?.smtpUser || 'noreply@scada.local'}>`;
    
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
          rejectUnauthorized: false
      }
    });

    try {
      await transporter.verify();
    } catch (error: any) {
      const errorMsg = `System SMTP server verification failed: ` + error.message;
      console.error(errorMsg);
      await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
      return { success: false, error: 'System SMTP server verification failed.' };
    }
    
    // Generate the email content using the templates
    const emailHtml = getPasswordResetEmailHtml(resetLink);
    const emailText = getPasswordResetEmailText(resetLink);

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: to,
        subject: subject,
        text: emailText,
        html: emailHtml,
      });

      console.log('Auth email sent successfully:', info.messageId);
      await addEmailLogToDb({ to, subject, status: 'sent' });
      return { success: true };

    } catch (error: any) {
      const errorMsg = 'Failed to send auth email: ' + error.message;
      console.error(errorMsg);
      await addEmailLogToDb({ to, subject, status: 'failed', error: errorMsg });
      return { success: false, error: "Failed to send authentication email." };
    }
  }
);
