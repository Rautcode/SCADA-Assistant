'use server';
/**
 * @fileOverview An unauthenticated Genkit flow for sending system-level emails (e.g., password reset).
 */

import { z } from 'zod';
import { AuthEmailInput } from '@/lib/types/flows';
import { sendEmail } from './send-email-flow';
import { defineFlow } from 'genkit/flow';


// This is an UNAUTHENTICATED flow. It should only be used for system-level actions
// like password resets where the user is not logged in.
// It explicitly invokes the sendEmail flow with system-level privileges.
export const sendAuthEmail = defineFlow(
  {
    name: 'sendAuthEmailFlow',
    inputSchema: AuthEmailInput,
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  async (input) => {
    // This call is secure because the `authOverride` is hardcoded to 'system'.
    // A client cannot control this value.
    return await sendEmail(input, { authOverride: { uid: 'system' } });
  }
);
