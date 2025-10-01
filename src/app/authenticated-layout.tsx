
"use client";

import { useAuth } from '@/components/auth/auth-provider';
import { AppShell } from '@/components/layout/app-shell';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { CustomLoader } from '@/components/layout/custom-loader';

export function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      router.push('/login');
    }
  }, [user, loading, router, pathname, isAuthPage]);

  if (loading || (!user && !isAuthPage)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <CustomLoader />
          <p className="text-muted-foreground mt-4">Loading application...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthPage) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
