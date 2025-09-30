
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { cn } from '@/lib/utils';
import { LocalizationProvider } from '@/components/localization/localization-provider';
import { AuthenticatedLayout } from './authenticated-layout';

export const metadata: Metadata = {
  title: 'SCADA Assistant',
  description: 'An AI-powered assistant for SCADA systems.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body
        className={cn(
          'h-full bg-background font-sans antialiased',
          GeistSans.variable,
          GeistMono.variable
        )}
        suppressHydrationWarning
      >
        <AuthProvider>
          <LocalizationProvider>
            <AuthenticatedLayout>{children}</AuthenticatedLayout>
            <Toaster />
          </LocalizationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
