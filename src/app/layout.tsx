
import './globals.css';
import type { Metadata } from 'next';
import { type ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { cn } from '@/lib/utils';
import { AuthenticatedLayout } from './authenticated-layout';
import { AppInitializer } from './app-initializer';
import { Providers } from './providers';


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
        <Providers>
          <AppInitializer>
            <AuthenticatedLayout>{children}</AuthenticatedLayout>
          </AppInitializer>
        </Providers>
      </body>
    </html>
  );
}
