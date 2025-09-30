
'use client';

import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/auth/auth-provider';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ConnectionProvider } from '@/components/database/connection-provider';
import { Assistant } from '@/components/assistant/assistant';
import { AssistantProvider } from '@/components/assistant/assistant-provider';
import { Toaster } from '@/components/ui/toaster';
import { GeistSans, GeistMono } from 'geist/font';
import { cn } from '@/lib/utils';
import './globals.css';
import { getUserSettings } from './actions/scada-actions';
import { LocalizationProvider } from '@/components/localization/localization-provider';

function applyTheme(theme: string) {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
        root.classList.add(systemTheme);
        return;
    }

    root.classList.add(theme);
}


function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.push('/login');
    }
  }, [user, loading, router, pathname, isAuthPage]);

  useEffect(() => {
    if (user) {
      getUserSettings({ userId: user.uid }).then((settings) => {
        if (settings?.theme) {
            applyTheme(settings.theme);
        }
      });
    }
  }, [user]);


  if (isAuthPage) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <ConnectionProvider>
      <SidebarProvider defaultOpen={true}>
        <AssistantProvider>
          <div className="flex min-h-screen bg-background">
            <AppSidebar />
            <div className="flex flex-1 flex-col min-w-0">
              <TopBar />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                {children}
              </main>
            </div>
          </div>
          <Assistant />
        </AssistantProvider>
      </SidebarProvider>
    </ConnectionProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head />
      <body
        suppressHydrationWarning={true}
        className={cn(
          'h-full bg-background font-sans antialiased',
          GeistSans.variable,
          GeistMono.variable
        )}
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

    