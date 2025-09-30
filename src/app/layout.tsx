
'use client';

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
import { useAuth } from '@/components/auth/auth-provider';
import { useEffect } from 'react';
import { getUserSettings } from './actions/scada-actions';

// Metadata can still be exported from a client component
export const metadata: Metadata = {
  title: 'SCADA Assistant',
  description: 'An AI-powered assistant for SCADA systems.',
};

function AppInitializer({ children }: { children: ReactNode }) {
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
