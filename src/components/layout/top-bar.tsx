
"use client";

import * as React from 'react';
import { Bell, CalendarDays, ChevronRight, LogOut, Settings, User, PanelLeft, AlertTriangle } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { onRecentActivities } from '@/services/client-database-service';
import type { RecentActivity, UserSettings } from '@/lib/types/database';
import { Unsubscribe } from 'firebase/firestore';
import { ScrollArea } from '../ui/scroll-area';
import { iconMap } from '@/lib/icon-map';
import { getUserSettings } from '@/app/actions/settings-actions';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppLogo } from './app-logo';
import { useAuth } from '../auth/auth-provider';

const NOTIFICATION_COUNT = 30;

export function TopBar() {
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const { toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = React.useState<RecentActivity[]>([]);
  const [lastSeen, setLastSeen] = React.useState<Date | null>(null);
  const [userSettings, setUserSettings] = React.useState<UserSettings | null>(null);


  React.useEffect(() => {
    // This will only run on the client, after hydration, avoiding mismatch
    setDate(new Date());

    if (!user) return;

    // Fetch user settings to check notification preferences
    getUserSettings().then(setUserSettings as any);
    

    const unsubscribe: Unsubscribe = onRecentActivities((activities) => {
      // Filter for activities that should appear as notifications (e.g., alerts, warnings)
      const notificationActivities = activities.filter(
        (act) => act.icon.includes('Alert') || act.icon.includes('Warning')
      );
      setNotifications(notificationActivities);
    }, NOTIFICATION_COUNT);

    const storedLastSeen = localStorage.getItem('lastNotificationSeen');
    setLastSeen(storedLastSeen ? new Date(storedLastSeen) : new Date(0));
    
    return () => unsubscribe();
  }, [user]);

  const handleNotificationsOpen = () => {
    const now = new Date();
    localStorage.setItem('lastNotificationSeen', now.toISOString());
    setLastSeen(now);
  }

  const unreadCount = lastSeen ? notifications.filter(
    (log) => log.timestamp > lastSeen
  ).length : notifications.length;

  const showNotifications = userSettings?.notifications?.inApp !== false;


  const handleLogout = async () => {
    try {
        await logout();
        toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
        router.push('/login');
    } catch (error) {
        toast({ title: 'Logout Failed', description: 'An error occurred during logout.', variant: 'destructive' });
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const words = name.split(' ');
    if (words.length > 1) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const generateBreadcrumbs = () => {
    const pathSegments = pathname.split('/').filter(segment => segment);
    
    // Don't generate breadcrumbs for the root dashboard page
    if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === 'dashboard')) {
        return [];
    }

    const breadcrumbs = pathSegments.map((segment, index) => {
      const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
      const label = segment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      return { label, href, isCurrent: index === pathSegments.length - 1 };
    });

    return [
        { label: 'Dashboard', href: '/dashboard', isCurrent: false },
        ...breadcrumbs
    ];
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
        
        <div className="flex items-center">
            {isMobile || breadcrumbs.length === 0 ? <AppLogo href="/dashboard" iconSize={24} textSize="text-lg" /> : null}
            
            <nav aria-label="Breadcrumb" className="hidden md:flex items-center text-sm ml-2">
            <ol role="list" className="flex items-center space-x-1">
                {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.href}-${index}`}>
                    <div className="flex items-center">
                        {index > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <Link
                            href={crumb.href}
                            className={cn(
                                'ml-1 font-medium',
                                crumb.isCurrent 
                                ? 'text-foreground' 
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                            aria-current={crumb.isCurrent ? 'page' : undefined}
                        >
                            {crumb.label}
                        </Link>
                    </div>
                </li>
                ))}
            </ol>
            </nav>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-auto justify-start text-left font-normal hidden sm:flex">
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

        {showNotifications && (
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
                <h3 className="text-lg font-medium">Notifications</h3>
                <p className="text-sm text-muted-foreground">You have {unreadCount} new notifications.</p>
                </div>
                <ScrollArea className="h-80">
                {notifications.length > 0 ? (
                    <ul>
                    {notifications.map((notification) => {
                        const Icon = iconMap[notification.icon] || AlertTriangle;
                        const timeAgo = lastSeen ? formatDistanceToNow(notification.timestamp, { addSuffix: true }) : '';
                        const isUnread = lastSeen && notification.timestamp > lastSeen;

                        return (
                        <li key={notification.id} className={`flex items-start gap-3 p-4 border-b ${isUnread ? 'bg-blue-50 dark:bg-primary/10' : ''}`}>
                            <div className={`p-1.5 rounded-full mt-1 ${notification.iconColor ? `${notification.iconColor}/20` : 'bg-muted'}`}>
                                <Icon className={`h-5 w-5 ${notification.iconColor || 'text-muted-foreground'}`} />
                            </div>
                            <div className='flex-1'>
                                <p className="text-sm font-medium">{notification.title}</p>
                                <p className="text-xs text-muted-foreground">{notification.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                            </div>
                            {isUnread && <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1" />}
                        </li>
                        )
                    })}
                    </ul>
                ) : (
                    <div className='p-8 text-center text-muted-foreground'>
                    <p>No new notifications.</p>
                    </div>
                )}
                </ScrollArea>
                <div className="p-2 border-t text-center">
                    <Link href="/wincc-activity-logger" className='text-sm text-primary hover:underline'>View all activity</Link>
                </div>
            </PopoverContent>
            </Popover>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                {user?.photoURL ? (
                    <AvatarImage src={user.photoURL} alt={user.displayName || 'User Avatar'} />
                ) : (
                    <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                        {getInitials(user?.displayName)}
                    </AvatarFallback>
                )}
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
