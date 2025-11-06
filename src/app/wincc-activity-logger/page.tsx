
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, AlertTriangle, Search, Calendar as CalendarIcon } from 'lucide-react';
import { onRecentActivities } from '@/services/database-service';
import type { RecentActivity } from '@/lib/types/database';
import { Unsubscribe } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { iconMap } from '@/lib/icon-map';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

const ActivityItem: React.FC<{activity: RecentActivity, loading?: boolean}> = React.memo(function ActivityItem({ activity, loading }) {
    if (loading) {
        return (
            <li className="flex items-start space-x-4 py-4 border-b">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-20" />
            </li>
        )
    }

    const Icon = iconMap[activity.icon] || AlertTriangle;
    const timeAgo = formatDistanceToNow(activity.timestamp, { addSuffix: true });

    return (
        <li className="flex items-start space-x-4 py-4 border-b">
            <div className={`p-2 rounded-full bg-muted mt-1 ${activity.iconColor || 'text-muted-foreground'} bg-opacity-20`}>
                <Icon className={`h-6 w-6 ${activity.iconColor || 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{activity.title}</p>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                 <p className="text-xs text-muted-foreground mt-1">{format(activity.timestamp, 'PPP p')}</p>
            </div>
            <p className="text-sm text-muted-foreground whitespace-nowrap">{timeAgo}</p>
        </li>
    );
});


export default function WinccActivityLoggerPage() {
    const [activities, setActivities] = React.useState<RecentActivity[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

    React.useEffect(() => {
        setLoading(true);
        const unsubscribe: Unsubscribe = onRecentActivities(activitiesData => {
            setActivities(activitiesData);
            setLoading(false);
        }, 50); // Fetch more activities for this page

        return () => unsubscribe();
    }, []);

    const filteredActivities = React.useMemo(() => {
        return activities.filter(activity => {
            const matchesSearch = searchTerm === '' ||
                activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                activity.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesDate = !dateRange || (
                (!dateRange.from || activity.timestamp >= dateRange.from) &&
                (!dateRange.to || activity.timestamp <= dateRange.to)
            );

            return matchesSearch && matchesDate;
        });
    }, [activities, searchTerm, dateRange]);


    const renderContent = () => {
        if (loading) {
            return (
                <ul className="divide-y divide-border -mx-6 px-6">
                  {Array.from({length: 7}).map((_, i) => <ActivityItem key={i} activity={{} as any} loading />)}
                </ul>
            );
        }

        if (filteredActivities.length === 0) {
            return (
                <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center">
                    <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">No Activities Found</h3>
                    <p className="text-sm text-muted-foreground">
                        No activities match your current filters.
                    </p>
                </div>
            )
        }
        
        return (
            <ul className='-mx-6 px-6'>
                {filteredActivities.map((activity) => <ActivityItem key={activity.id} activity={activity} />)}
            </ul>
        );
    };

  return (
    <div className="w-full">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold">
            <Activity className="mr-3 h-7 w-7 text-primary" />
            WinCC Activity Logger
          </CardTitle>
           <CardDescription>
            A real-time feed of system and user activities.
          </CardDescription>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search activities..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full sm:w-auto justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date range</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
