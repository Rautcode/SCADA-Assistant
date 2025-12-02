
/**
 * @fileoverview This file contains server-side functions to generate branded
 * HTML and text content for the password reset email. It is not a React component.
 */

const APP_NAME = "SCADA Assistant";
const COMPANY_NAME = "SCADA Systems Inc.";
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:9002";


// Main function to generate the full HTML content for the password reset email.
export function getPasswordResetEmailHtml(resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            .body-container { font-family: Arial, sans-serif; background-color: #f4f7f6; padding: 20px; }
            .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
            .header { background-color: #1E88E5; padding: 20px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; color: #333333; line-height: 1.6; }
            .content p { margin: 0 0 1em 0; }
            .button-container { text-align: center; margin: 20px 0; }
            .button { background-color: #1E88E5; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
            .link-container { word-break: break-all; font-size: 12px; color: #888888; margin-top: 20px; }
            .footer { background-color: #f4f7f6; padding: 20px; text-align: center; font-size: 12px; color: #888888; }
            .footer a { color: #1E88E5; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="body-container">
            <div class="email-container">
                <div class="header">
                    <h1>${APP_NAME}</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>We received a request to reset your password for your account with ${APP_NAME}.</p>
                    <p>Click the button below to set a new password. This link is valid for one hour.</p>
                    <div class="button-container">
                        <a href="${resetLink}" class="button">Reset Your Password</a>
                    </div>
                    <p>If you did not request a password reset, please ignore this email or contact our support team if you have concerns.</p>
                    <p>Thanks,<br>The ${APP_NAME} Team</p>
                    <div class="link-container">
                        <p>If you're having trouble with the button above, copy and paste the URL below into your web browser:</p>
                        <a href="${resetLink}">${resetLink}</a>
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
                    <p>
                        <a href="${APP_URL}/help">Help Center</a> | <a href="${APP_URL}/profile">Account Settings</a>
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Function to generate the plain text version of the email.
export function getPasswordResetEmailText(resetLink: string): string {
  return `
    Hello,

    We received a request to reset your password for your account with ${APP_NAME}.

    Please copy and paste the following URL into your web browser to reset your password:
    ${resetLink}

    This link is valid for one hour.

    If you did not request a password reset, please ignore this email.

    Thanks,
    The ${APP_NAME} Team

    ---
    © ${new Date().getFullYear()} ${COMPANY_NAME}
    ${APP_URL}
  `;
}
