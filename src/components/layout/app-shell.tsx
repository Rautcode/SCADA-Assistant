
'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { SidebarProvider } from '@/components/ui/sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="grid grid-cols-[auto_1fr] min-h-screen bg-background">
        <AppSidebar />
        <div className="flex flex-col">
          <TopBar />
          <main className="p-4 md:p-6 lg:p-8">
              {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
