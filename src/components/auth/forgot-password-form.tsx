"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";

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
import { sendEmail } from "@/ai/flows/send-email-flow";

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
      // The standard Firebase client SDK generates the secure oobCode (action code)
      const actionCodeSettings = {
        url: `${window.location.origin}/login`, // URL to redirect back to
        handleCodeInApp: true,
      };

      // We use the CLIENT-SIDE SDK to send the email, which uses the built-in Firebase email service.
      await sendPasswordResetEmail(auth, values.email, actionCodeSettings);

      toast({
        title: "Password Reset Email Sent",
        description:
          "If an account exists for this email, you will receive a password reset link from Firebase. Please check your inbox.",
      });
      form.reset();
    } catch (error: any) {
      console.error("Password reset failed:", error);
      toast({
        title: "Password Reset Failed",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
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
