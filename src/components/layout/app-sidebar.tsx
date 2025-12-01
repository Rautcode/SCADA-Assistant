
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, FileText, Settings, Activity, FileWarning, Mail, CalendarClock, HelpCircle, User, LogOut, ChevronsLeft, ChevronsRight, UserCircle2, BookOpen
} from 'lucide-react';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AppLogo } from './app-logo';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/report-generator', label: 'Report Generator', icon: FileText },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/scheduler', label: 'Scheduler', icon: CalendarClock },
];

const monitoringNavItems = [
  { href: '/health-check', label: 'Health Check', icon: Activity },
  { href: '/wincc-activity-logger', label: 'Activity Log', icon: Activity },
  { href: '/logs-errors', label: 'System Logs', icon: FileWarning },
  { href: '/email-sender', label: 'Email Logs', icon: Mail },
];

const helpAndSettingsItems = [
    { href: '/docs', label: 'Documentation', icon: BookOpen },
    { href: '/help', label: 'Help', icon: HelpCircle },
    { href: '/settings', label: 'Settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open, toggleSidebar, isMobile, state, setOpen } = useSidebar();
  const { user, logout } = useAuth();
  const { toast } = useToast();

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

  const UserProfile = () => (
     <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-sidebar-primary">
            {user?.photoURL ? (
              <AvatarImage src={user.photoURL} alt={user.displayName || 'User Avatar'} />
            ) : (
              <AvatarFallback className="bg-background text-foreground font-semibold">
                {getInitials(user?.displayName)}
              </AvatarFallback>
            )}
        </Avatar>
        <div className={cn("flex flex-col truncate", state !== 'expanded' && "hidden")}>
          <span className="text-sm font-semibold text-sidebar-foreground truncate">{user?.displayName || 'User'}</span>
          <span className="text-xs text-sidebar-foreground/70 truncate">{user?.email}</span>
        </div>
    </div>
  );

  const NavLink = ({ item }: { item: { href: string; label: string; icon: React.ElementType } }) => (
    <SidebarMenuItem>
      <Link href={item.href} passHref legacyBehavior>
        <SidebarMenuButton
          onClick={() => {
            if (isMobile) {
              setOpen(false);
            }
          }}
          isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
          tooltip={{ children: item.label, className: "bg-sidebar text-sidebar-foreground border-sidebar-border" }}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
        >
          <item.icon className="h-5 w-5" />
          <span className={cn("truncate", state !== 'expanded' && "hidden")}>{item.label}</span>
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );

  return (
    <Sidebar side="left" collapsible={isMobile ? "offcanvas" : "icon"} variant="sidebar" className="flex flex-col border-r border-sidebar-border shadow-md">
      <SidebarHeader className="p-4 flex items-center justify-between">
          {state === "expanded" && <AppLogo href="/dashboard" />}
          {!isMobile && (
             <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-sidebar-foreground hover:bg-sidebar-accent">
              {open ? <ChevronsLeft /> : <ChevronsRight />}
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          )}
      </SidebarHeader>
      
      <SidebarContent className="flex-1 overflow-y-auto px-2 space-y-2">
        <SidebarGroup>
          {state === 'expanded' && <SidebarGroupLabel>Main</SidebarGroupLabel>}
          <SidebarMenu>
            {mainNavItems.map((item) => <NavLink key={item.href} item={item} />)}
          </SidebarMenu>
        </SidebarGroup>
        
        <SidebarGroup>
          {state === 'expanded' && <SidebarGroupLabel>Monitoring & Health</SidebarGroupLabel>}
          <SidebarMenu>
            {monitoringNavItems.map((item) => <NavLink key={item.href} item={item} />)}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 space-y-2">
        <Separator className="bg-sidebar-border"/>
         <SidebarMenu>
           {helpAndSettingsItems.map((item) => (
             <NavLink key={item.href} item={item} />
          ))}
           <NavLink item={{href: '/profile', label: 'Profile', icon: UserCircle2}}/>
        </SidebarMenu>
         <Separator className="bg-sidebar-border"/>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2 h-auto text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <UserProfile />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56 bg-card text-card-foreground mb-2 ml-1">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator/>
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User className="mr-2 h-4 w-4"/>
                    Profile
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className="mr-2 h-4 w-4"/>
                    Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator/>
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4"/>
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
