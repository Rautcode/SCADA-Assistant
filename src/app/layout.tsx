
import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { cn } from '@/lib/utils';
import { LocalizationProvider, useLocalization } from '@/components/localization/localization-provider';
import { AuthenticatedLayout } from './authenticated-layout';
import { getUserSettings } from './actions/scada-actions';
import { useAuth } from '@/components/auth/auth-provider';
import { useEffect } from 'react';

// Metadata can now be correctly exported from the RootLayout Server Component.
export const metadata: Metadata = {
  title: 'SCADA Assistant',
  description: 'An AI-powered assistant for SCADA systems.',
};

// This is a new client component to handle client-side effects like fetching settings.
function AppInitializer({ children }: { children: ReactNode }) {
  'use client';
  const { user } = useAuth();
  const { setLanguage } = useLocalization();

  useEffect(() => {
    if (user) {
      getUserSettings({ userId: user.uid })
        .then(settings => {
          if (settings?.language) {
            setLanguage(settings.language);
          }
        })
        .catch(error => {
          console.warn("Could not fetch user settings on load:", error);
        });
    }
  }, [user, setLanguage]);

  return <>{children}</>;
}


export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        suppressHydrationWarning
        className={cn(
          'h-full bg-background font-sans antialiased',
          GeistSans.variable,
          GeistMono.variable
        )}
      >
        <AuthProvider>
          <LocalizationProvider>
            <AppInitializer>
              <AuthenticatedLayout>{children}</AuthenticatedLayout>
              <Toaster />
            </AppInitializer>
          </LocalizationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
