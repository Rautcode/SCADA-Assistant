"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { getAuth, generatePasswordResetLink } from "firebase/auth";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { sendAuthEmail } from "@/ai/flows/auth-email-flow";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const auth = getAuth();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      // 1. Securely generate the password reset link (oobCode) using the client SDK.
      const actionCodeSettings = {
        url: `${window.location.origin}/login`, // URL to redirect back to
        handleCodeInApp: true,
      };
      const actionLink = await generatePasswordResetLink(auth, values.email, actionCodeSettings);

      // 2. Call the secure backend flow to send the email via the system's SMTP server.
      await sendAuthEmail({
        to: values.email,
        subject: "Reset your SCADA Assistant Password",
        text: `Hello,\n\nPlease reset your password by clicking the following link: ${actionLink}\n\nIf you did not request this, please ignore this email.\n\nThanks,\nThe SCADA Assistant Team`,
        html: `<p>Hello,</p><p>Please reset your password by clicking the link below:</p><p><a href="${actionLink}">Reset Password</a></p><p>If you did not request this, please ignore this email.</p><p>Thanks,<br/>The SCADA Assistant Team</p>`,
      });

      toast({
        title: "Password Reset Email Sent",
        description:
          "If an account exists for this email, you will receive a password reset link. Please check your inbox.",
      });
      form.reset();

    } catch (error: any) {
      console.error("Password reset failed:", error);
       // Firebase might throw an error if the email doesn't exist, but we don't want to reveal that to the user.
       // We'll show a generic success message to prevent user enumeration attacks, but log the error.
      toast({
        title: "Password Reset Email Sent",
        description: "If an account with that email exists, a reset link has been sent.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="e.g., user@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>
    </Form>
  );
}
