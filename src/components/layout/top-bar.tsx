
"use client";

import * as React from 'react';
import { Bell, CalendarDays, ChevronRight, LogOut, Settings, User, PanelLeft, AlertTriangle } from 'lucide-react';
import { AppLogo } from './app-logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, formatDistanceToNow } from 'date-fns';
import { useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import imageData from '@/app/lib/placeholder-images.json';
import { useAuth } from '../auth/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { onLogs } from '@/services/database-service';
import type { SystemLog } from '@/lib/types/database';
import { Unsubscribe } from 'firebase/firestore';
import { iconMap } from '@/lib/icon-map';
import { ScrollArea } from '../ui/scroll-area';

export function TopBar() {
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const { toggleSidebar, isMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [errorLogs, setErrorLogs] = React.useState<SystemLog[]>([]);
  const [lastSeen, setLastSeen] = React.useState<Date | null>(null);

  React.useEffect(() => {
    // This will only run on the client, after hydration, avoiding mismatch
    setDate(new Date());

    const unsubscribe: Unsubscribe = onLogs((logs) => {
      const errors = logs.filter(log => log.level === 'error');
      setErrorLogs(errors);
    });

    const storedLastSeen = localStorage.getItem('lastErrorSeen');
    if (storedLastSeen) {
      setLastSeen(new Date(storedLastSeen));
    } else {
      setLastSeen(new Date(0));
    }
    
    return () => unsubscribe();
  }, []);

  const handleNotificationsOpen = () => {
    const now = new Date();
    localStorage.setItem('lastErrorSeen', now.toISOString());
    setLastSeen(now);
  }

  const unreadCount = lastSeen ? errorLogs.filter(
    (log) => log.timestamp > lastSeen
  ).length : errorLogs.length;


  const handleLogout = async () => {
    try {
        await logout();
        toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
        router.push('/login');
    } catch (error) {
        toast({ title: 'Logout Failed', description: 'An error occurred during logout.', variant: 'destructive' });
    }
  };

  const generateBreadcrumbs = () => {
    const pathSegments = pathname.split('/').filter(segment => segment);
    const breadcrumbs = [{ label: 'Home', href: '/dashboard' }];
    
    let currentPath = '';
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      if (currentPath === '/dashboard' && breadcrumbs.length === 1 && breadcrumbs[0].href === '/dashboard') {
        if (segment.toLowerCase() !== 'dashboard') {
             breadcrumbs.push({
                label: segment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                href: currentPath
            });
        } else if (breadcrumbs.length > 0 && breadcrumbs[breadcrumbs.length-1].href !== currentPath) {
            breadcrumbs.push({
                label: segment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                href: currentPath
            });
        }

      } else {
         breadcrumbs.push({
            label: segment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            href: currentPath
        });
      }
    });
    if (breadcrumbs.length > 1 && breadcrumbs[0].href === breadcrumbs[1].href) {
        breadcrumbs.splice(0,1);
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-4">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="-ml-2">
            <PanelLeft className="h-6 w-6" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        )}
        {!isMobile && <AppLogo href="/dashboard" iconSize={24} textSize="text-lg" />}

        <nav aria-label="Breadcrumb" className="hidden md:flex items-center text-sm">
          <ol role="list" className="flex items-center space-x-1">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.href}-${index}`}>
                <div className="flex items-center">
                  {index > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <Link
                    href={crumb.href}
                    className={`ml-1 font-medium ${index === breadcrumbs.length -1 ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
                  >
                    {crumb.label}
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-auto justify-start text-left font-normal">
              <CalendarDays className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover onOpenChange={(open) => { if(open) handleNotificationsOpen()}}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className='p-4 border-b'>
              <h3 className="text-lg font-medium">Errors & Alerts</h3>
              <p className="text-sm text-muted-foreground">You have {unreadCount} new errors.</p>
            </div>
             <ScrollArea className="h-80">
              {errorLogs.length > 0 ? (
                <ul>
                  {errorLogs.map((log) => {
                    const Icon = AlertTriangle;
                    const timeAgo = lastSeen ? formatDistanceToNow(log.timestamp, { addSuffix: true }) : '';
                    const isUnread = lastSeen && log.timestamp > lastSeen;

                    return (
                       <li key={log.id} className={`flex items-start gap-3 p-4 border-b ${isUnread ? 'bg-red-50 dark:bg-destructive/10' : ''}`}>
                          <div className='p-1.5 rounded-full mt-1 bg-destructive/20'>
                            <Icon className='h-5 w-5 text-destructive' />
                          </div>
                          <div className='flex-1'>
                            <p className="text-sm font-medium">{log.message}</p>
                            <p className="text-xs text-muted-foreground">{log.source}</p>
                            <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                          </div>
                          {isUnread && <div className="h-2.5 w-2.5 rounded-full bg-destructive mt-1" />}
                       </li>
                    )
                  })}
                </ul>
              ) : (
                <div className='p-8 text-center text-muted-foreground'>
                  <p>No errors reported.</p>
                </div>
              )}
             </ScrollArea>
             <div className="p-2 border-t text-center">
                <Link href="/logs-errors" className='text-sm text-primary hover:underline'>View all logs</Link>
             </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL || imageData.avatars.user.src} alt={imageData.avatars.user.alt} data-ai-hint={imageData.avatars.user.hint}/>
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.displayName || 'User Admin'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
