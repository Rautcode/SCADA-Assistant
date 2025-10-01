
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, FilePlus, CalendarClock, Users, AlertTriangle, CheckCircle2, Settings } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import imageData from '@/app/lib/placeholder-images.json';
import { onDashboardStats, onRecentActivities, onSystemComponentStatuses } from '@/services/database-service';
import type { DashboardStats, RecentActivity, SystemComponentStatus } from '@/lib/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Unsubscribe } from 'firebase/firestore';
import { iconMap } from '@/lib/icon-map';
import { useConnection } from '@/components/database/connection-provider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  trendDirection?: 'up' | 'down';
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = React.memo(function StatCard({ title, value, icon: Icon, description, trendDirection, loading }) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-3/4 mb-1" />
            <Skeleton className="h-4 w-1/2" />
          </>
        ) : (
        <>
          <div className="text-3xl font-bold">{value}</div>
          {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
        </>
        )}
      </CardContent>
    </Card>
  );
});

interface QuickActionProps {
  title: string;
  icon: React.ElementType;
  href: string;
  description: string;
}

const QuickAction: React.FC<QuickActionProps> = React.memo(function QuickAction({ title, icon: Icon, href, description }) {
  return (
    <Link href={href} passHref>
      <Card className="p-4 flex flex-col items-start justify-start h-auto text-left shadow-sm hover:shadow-md transition-shadow duration-300 w-full hover:bg-muted/50 cursor-pointer">
        <div className="flex items-center mb-2">
          <Icon className="h-6 w-6 mr-3 text-primary" />
          <span className="text-lg font-semibold text-foreground">{title}</span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </Card>
    </Link>
  );
});

const ActivityItem: React.FC<{activity: RecentActivity, loading?: boolean}> = React.memo(function ActivityItem({ activity, loading }) {
    if (loading) {
        return (
            <li className="flex items-start space-x-3 py-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-16" />
            </li>
        )
    }

    const Icon = iconMap[activity.icon] || AlertTriangle;
    const timeAgo = formatDistanceToNow(activity.timestamp, { addSuffix: true });

    return (
        <li className="flex items-start space-x-3 py-3">
            <div className={`p-1.5 rounded-full bg-muted ${activity.iconColor || 'text-muted-foreground'} bg-opacity-20`}>
            <Icon className={`h-5 w-5 ${activity.iconColor || 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{activity.title}</p>
            <p className="text-xs text-muted-foreground">{activity.description}</p>
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</p>
        </li>
    );
});

const SystemStatusItem: React.FC<{ item?: SystemComponentStatus; loading?: boolean }> = React.memo(function SystemStatusItem({ item, loading }) {
  if (loading || !item) {
    return (
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-1/4" />
      </div>
    );
  }

  const statusConfig = {
    Connected: { color: "bg-green-500", label: "Connected" },
    Active: { color: "bg-green-500", label: "Active" },
    Idle: { color: "bg-green-500", label: "Idle" },
    Degraded: { color: "bg-orange-500", label: "Degraded" },
    Error: { color: "bg-red-500", label: "Error" },
  };

  const { color, label } = statusConfig[item.status] || { color: "bg-gray-400", label: "Unknown" };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{item.name}</span>
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", color)}></span>
            <span className={cn("relative inline-flex rounded-full h-3 w-3", color)}></span>
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
    </div>
  );
});


const DatabaseConnectionNotification = () => {
    const { status, error, loading } = useConnection();

    if (status === 'connected' || loading) return null;

    const title = status === 'error' ? 'Database Connection Failed' : 'Database Not Configured';
    const description = status === 'error' ? error : "Please configure your SCADA database connection to see live data.";

    return (
        <Alert variant="destructive" className="mb-6 shadow-lg">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>
                {description}
                <Button asChild variant="destructive" className="mt-4">
                    <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" /> Go to Settings
                    </Link>
                </Button>
            </AlertDescription>
        </Alert>
    )
}


export default function DashboardPage() {
  const [currentDate, setCurrentDate] = React.useState("Loading...");
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [activities, setActivities] = React.useState<RecentActivity[]>([]);
  const [systemStatus, setSystemStatus] = React.useState<SystemComponentStatus[]>([]);
  const { status: dbStatus } = useConnection();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // This will only run on the client, after hydration
    setCurrentDate(new Date().toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }));

    if (dbStatus !== 'connected') {
        setLoading(false);
        // Reset data if db disconnects
        setStats(null);
        setActivities([]);
        setSystemStatus([]);
        return;
    }

    setLoading(true);
    const unsubscribers: Unsubscribe[] = [];

    unsubscribers.push(onDashboardStats(statsData => {
        setStats(statsData);
        if (statsData !== undefined) { // Can be null, which is valid
          setLoading(false);
        }
    }));

    unsubscribers.push(onRecentActivities(activitiesData => {
        setActivities(activitiesData);
    }));

    unsubscribers.push(onSystemComponentStatuses(statusData => {
        setSystemStatus(statusData);
    }));

    // Fallback timer to stop loading indicator
    const timer = setTimeout(() => {
        if (dbStatus !== 'loading') {
            setLoading(false);
        }
    }, 2500);

    return () => {
        unsubscribers.forEach(unsub => unsub());
        clearTimeout(timer);
    }

  }, [dbStatus]);

  const isDataLoading = (loading && dbStatus === 'connected') || dbStatus === 'loading';

  const showEmptyState = !isDataLoading && dbStatus !== 'connected' && !stats && activities.length === 0 && systemStatus.length === 0;

  return (
    <div className="animate-fade-in">
      <Card className="mb-6 shadow-lg bg-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Welcome to SCADA Assistant</h1>
              <p className="text-lg text-muted-foreground mt-1">
                {currentDate}
              </p>
            </div>
            <Image 
              src={imageData.dashboard.banner.src} 
              alt={imageData.dashboard.banner.alt} 
              width={imageData.dashboard.banner.width} 
              height={imageData.dashboard.banner.height} 
              className="rounded-lg mt-4 md:mt-0 shadow-md" 
              data-ai-hint={imageData.dashboard.banner.hint}
            />
          </div>
        </CardContent>
      </Card>
      
      <DatabaseConnectionNotification />

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction title="New Report" icon={FilePlus} href="/report-generator" description="Generate a new SCADA report." />
          <QuickAction title="View Templates" icon={BarChart3} href="/templates" description="Manage and edit report templates." />
          <QuickAction title="Check Schedule" icon={CalendarClock} href="/scheduler" description="View and manage scheduled tasks." />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-foreground">System Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Reports Generated (Month)" value={stats?.reports?.toLocaleString() ?? '...'} icon={FilePlus} description="Monthly total from live data" loading={isDataLoading} />
          <StatCard title="Scheduled Tasks" value={stats?.tasks?.toString() ?? '...'} icon={CalendarClock} description="Pending automated tasks" loading={isDataLoading} />
          <StatCard title="Active Users" value={stats?.users?.toString() ?? '...'} icon={Users} description="Users currently online" loading={isDataLoading} />
          <StatCard title="System Status" value={stats?.systemStatus ?? '...'} icon={CheckCircle2} description="Overall operational status" loading={isDataLoading} />
        </div>
      </section>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Track the latest system and user activities.</CardDescription>
          </CardHeader>
          <CardContent>
            {showEmptyState ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Connect to the database to see recent activity.</p>
                </div>
             ) : isDataLoading && activities.length === 0 ? (
                Array.from({length: 5}).map((_, i) => <ActivityItem key={i} activity={{} as any} loading />)
              ) : activities.length > 0 ? (
                <ul className="divide-y divide-border -mx-6 px-6">
                  {activities.map((activity) => <ActivityItem key={activity.id} activity={activity} />)}
                </ul>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent activity found.</p>
                </div>
              )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
             <CardDescription>Health overview of critical components.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showEmptyState ? (
                <div className="text-center py-8 text-muted-foreground">
                    <p>Connect to the database to see system status.</p>
                </div>
             ) :isDataLoading && systemStatus.length === 0 ? (
                Array.from({length: 4}).map((_, i) => <SystemStatusItem key={i} loading />)
             ) : systemStatus.length > 0 ? (
                systemStatus.map((item) => <SystemStatusItem key={item.name} item={item} />)
             ) : (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No system components to display.</p>
                </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    
