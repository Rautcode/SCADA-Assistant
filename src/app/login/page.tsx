
import { AppLogo } from '@/components/layout/app-logo';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-dvh">
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-xl animate-fade-in">
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
                    <p className="mt-4 text-xs">Support: support@scada-assistant.com</p>
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
