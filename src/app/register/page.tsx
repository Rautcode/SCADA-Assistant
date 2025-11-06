
import { AppLogo } from '@/components/layout/app-logo';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RegisterForm } from '@/components/auth/register-form';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="flex flex-col min-h-dvh">
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-lg shadow-xl animate-fade-in">
                <CardHeader className="items-center text-center">
                    <AppLogo className="mb-4" iconSize={40} textSize="text-3xl" href="/" />
                    <CardTitle className="text-2xl">Create an Account</CardTitle>
                    <CardDescription>Enter your details to get started</CardDescription>
                </CardHeader>
                <CardContent>
                    <RegisterForm />
                </CardContent>
                 <CardFooter className="flex-col items-center text-sm text-muted-foreground">
                    <p>
                        Already have an account?{' '}
                        <Link href="/login" className="text-primary hover:underline">
                            Log in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
