
'use server';

import { sendEmail } from "@/ai/flows/send-email-flow";

// In-memory store for rate limiting password reset requests.
// In a distributed environment, a shared store like Redis would be more appropriate.
const resetRequestTimestamps = new Map<string, number>();
const RATE_LIMIT_PERIOD = 30000; // 30 seconds

/**
 * A server action that uses the custom SMTP service to send a password reset email.
 * The reset link is generated on the client and passed to this action.
 */
export async function sendCustomPasswordResetEmail({ email, link }: { email: string; link: string }): Promise<{ success: boolean; error?: string }> {
  const now = Date.now();
  const lastRequestTime = resetRequestTimestamps.get(email);

  if (lastRequestTime && (now - lastRequestTime) < RATE_LIMIT_PERIOD) {
    console.warn(`Rate limit exceeded for password reset: ${email}`);
    // Return success to prevent leaking information about which emails are being targeted.
    return { success: true };
  }
  
  const emailHtml = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2>Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset the password for your account associated with this email address.</p>
      <p>To reset your password, please click the link below:</p>
      <p style="margin: 20px 0;">
        <a href="${link}" style="background-color: #1E88E5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      </p>
      <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <p>Thanks,<br/>The SCADA Assistant Team</p>
    </div>
  `;
  
  try {
    resetRequestTimestamps.set(email, now);
    
    const result = await sendEmail({
      userId: 'system', // Use 'system' to signify this is a system-level email
      to: email,
      subject: 'Your Password Reset Link for SCADA Assistant',
      text: `Hello,\n\nPlease reset your password by clicking this link: ${link}\n\nIf you did not request this, please ignore this email.\n\nThanks,\nThe SCADA Assistant Team`,
      html: emailHtml,
    });
    
    if (!result.success && result.error === "Skipped: System email notifications are not configured.") {
      console.error("CRITICAL: Password reset email could not be sent because system SMTP settings are not configured.");
      // Do not expose this to the client, but it's a critical server log.
      return { success: false, error: "The server is not configured to send emails. Please contact an administrator." };
    }

    return result;

  } catch (error: any) {
    console.error("Error in sendCustomPasswordResetEmail action:", error);
    return { success: false, error: "An unknown server error occurred while sending the email." };
  }
}

