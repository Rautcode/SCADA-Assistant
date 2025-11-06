
'use client';
import { AppLogo } from '@/components/layout/app-logo';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const LoginForm = dynamic(() => import('@/components/auth/login-form').then(mod => mod.LoginForm), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ),
  ssr: false,
});

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-background p-4">
        <Card className="w-full max-w-lg shadow-xl animate-fade-in">
            <CardHeader className="items-center text-center">
                <AppLogo className="mb-4" iconSize={40} textSize="text-3xl" href="/" />
                <CardTitle className="text-2xl">Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent>
                <LoginForm />
            </CardContent>
            <CardFooter className="flex-col items-center text-sm text-muted-foreground">
                <p>
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="text-primary hover:underline">
                        Sign up
                    </Link>
                </p>
                <p className="mt-4 text-xs">Support: manav@evio.in</p>
            </CardFooter>
        </Card>
    </div>
  );
}
