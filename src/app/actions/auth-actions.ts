
'use server';

import { sendEmail } from "@/ai/flows/send-email-flow";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, App } from 'firebase-admin/app';

// Ensure Firebase admin is initialized
function getAdminApp(): App {
    if (getApps().length) {
        return getApps()[0];
    }
    // In a real server environment, you'd use serviceAccountCredentials
    // For this environment, we rely on default application credentials if available
    return initializeApp();
}

/**
 * A server action to generate a password reset link and send it via the custom SMTP service.
 */
export async function sendCustomPasswordResetEmail({ email }: { email: string }): Promise<{ success: boolean; error?: string }> {
  
  let link: string;
  try {
    getAdminApp(); // Ensure app is initialized
    link = await getAuth().generatePasswordResetLink(email);
  } catch (error: any) {
    console.error("Error generating password reset link:", error);
    // Hide specific firebase errors from client, like "USER_NOT_FOUND"
    // Return success to prevent user enumeration attacks.
    if (error.code === 'auth/user-not-found') {
        console.warn(`Password reset attempted for non-existent user: ${email}`);
        return { success: true }; // Don't reveal that the user doesn't exist
    }
    return { success: false, error: "Failed to generate password reset link." };
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
    // The sendEmail flow is designed to use a 'system' user for global SMTP settings
    // when a specific user's settings aren't available (e.g., logged out state).
    const result = await sendEmail({
      userId: 'system',
      to: email,
      subject: 'Your Password Reset Link for SCADA Assistant',
      text: `Hello,\n\nPlease reset your password by clicking this link: ${link}\n\nIf you did not request this, please ignore this email.\n\nThanks,\nThe SCADA Assistant Team`,
      html: emailHtml,
    });
    
    return result;

  } catch (error: any) {
    console.error("Error in sendCustomPasswordResetEmail action:", error);
    return { success: false, error: error.message || "An unknown server error occurred." };
  }
}
