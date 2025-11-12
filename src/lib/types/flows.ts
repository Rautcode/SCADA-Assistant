
import { z } from 'zod';

export const SendEmailInput = z.object({
  to: z.string().email(),
  subject: z.string(),
  text: z.string(),
  html: z.string(),
});
export type SendEmailInput = z.infer<typeof SendEmailInput>;


export const AuthEmailInput = z.object({
  to: z.string().email(),
  subject: z.string(),
  text: z.string(),
  html: z.string(),
});
export type AuthEmailInput = z.infer<typeof AuthEmailInput>;
