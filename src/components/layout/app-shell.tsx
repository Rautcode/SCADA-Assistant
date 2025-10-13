
'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { SidebarProvider } from '@/components/ui/sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full">
                {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
