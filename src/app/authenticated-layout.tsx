
"use client";

import { useAuth } from '@/components/auth/auth-provider';
import { AppShell } from '@/components/layout/app-shell';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { CustomLoader } from '@/components/layout/custom-loader';
import { cn } from '@/lib/utils';

export function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.push('/login');
    }
  }, [user, loading, router, pathname, isAuthPage]);

  // Show a loading screen while auth state is resolving, or if we are about to redirect.
  if (loading || (!user && !isAuthPage)) {
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-screen bg-background relative")}>
        <div className="wave-background">
          <div></div>
        </div>
        <div className="flex flex-col items-center gap-4 animate-fade-in z-10">
          <CustomLoader />
          <p className="text-muted-foreground mt-4">Loading application...</p>
        </div>
      </div>
    );
  }
  
  // If we're on an auth page (Login/Register), just render the content directly
  // without the main app shell.
  if (isAuthPage) {
    return (
      <div className="min-h-dvh bg-background relative">
        <div className="wave-background">
          <div></div>
        </div>
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  // If the user is authenticated and not on an auth page, render the full app shell.
  return (
    <div className="h-full bg-background">
        <AppShell>{children}</AppShell>
    </div>
  );
}
