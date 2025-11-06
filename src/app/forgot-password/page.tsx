
'use client';
import { AppLogo } from '@/components/layout/app-logo';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-background p-4">
        <Card className="w-full max-w-lg shadow-xl animate-fade-in">
            <CardHeader className="items-center text-center">
                <AppLogo className="mb-4" iconSize={40} textSize="text-3xl" href="/" />
                <CardTitle className="text-2xl">Forgot Password</CardTitle>
                <CardDescription>Enter your email to receive a password reset link</CardDescription>
            </CardHeader>
            <CardContent>
                <ForgotPasswordForm />
            </CardContent>
            <CardFooter className="flex-col items-center text-sm text-muted-foreground">
                <p>
                    Remembered your password?{' '}
                    <Link href="/login" className="text-primary hover:underline">
                        Log in
                    </Link>
                </p>
            </CardFooter>
        </Card>
    </div>
  );
}
