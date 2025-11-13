
"use client";

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarClock, PlusCircle, AlertTriangle, FileText, CheckCircle2, XCircle, Timer, Settings, Loader2 } from 'lucide-react';
import { getScheduledTasks, getReportTemplates } from '@/services/client-database-service';
import type { ScheduledTask, ReportTemplate } from '@/lib/types/database';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConnection } from '@/components/database/connection-provider';
import Link from 'next/link';
import { categoryIcons } from '@/lib/icon-map';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '../auth/auth-provider';

const NewTaskDialog = dynamic(() =>
  import('@/components/scheduler/new-task-dialog').then((mod) => mod.NewTaskDialog),
  { ssr: false, loading: () => <p>Loading...</p> }
);

const statusConfig = {
    scheduled: { icon: Timer, color: "bg-blue-500", label: "Scheduled" },
    processing: { icon: Loader2, color: "bg-purple-500", label: "Processing" },
    completed: { icon: CheckCircle2, color: "bg-green-500", label: "Completed" },
    failed: { icon: XCircle, color: "bg-red-500", label: "Failed" },
    overdue: { icon: AlertTriangle, color: "bg-yellow-500", label: "Overdue" },
};

const TaskItem = React.memo(function TaskItem({ task, template, loading }: { task?: ScheduledTask, template?: ReportTemplate, loading?: boolean }) {
    if (loading || !task) {
        return (
            <Card className="shadow-sm">
                <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-md" />
                        <div className="space-y-2">
                             <Skeleton className="h-4 w-32" />
                             <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                     <Skeleton className="h-8 w-24 rounded-full" />
                </CardContent>
            </Card>
        )
    }

    const effectiveStatus = (task.status === 'scheduled' && new Date(task.scheduledTime) < new Date()) ? 'overdue' : task.status;
    const { icon: Icon, color, label } = statusConfig[effectiveStatus as keyof typeof statusConfig] || statusConfig.scheduled;
    const TemplateIcon = categoryIcons[template?.category || 'default'] || FileText;

    const StatusBadge = (
        <Badge className={cn("text-white flex-shrink-0 self-start sm:self-center", color)}>
            <Icon className={cn("mr-2 h-4 w-4", effectiveStatus === 'processing' && 'animate-spin')} />
            {label}
        </Badge>
    );

    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg">{task.name}</CardTitle>
                <CardDescription>
                    Scheduled for: {format(new Date(task.scheduledTime), 'PPpp')}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative overflow-hidden rounded-md aspect-square h-12 w-12 flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
                        <TemplateIcon className="h-6 w-6 text-primary/80 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-foreground">{template?.name || "Template not found"}</p>
                        <p className="text-xs text-muted-foreground">{template?.category || "Uncategorized"}</p>
                    </div>
                </div>
                 {task.error ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="cursor-help">{StatusBadge}</div>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-xs text-destructive-foreground bg-destructive p-2 rounded-md">{task.error}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                 ) : StatusBadge}
            </CardContent>
        </Card>
    );
});

export default function SchedulerPage() {
    const [tasks, setTasks] = React.useState<ScheduledTask[]>([]);
    const [templates, setTemplates] = React.useState<ReportTemplate[]>([]);
    const [tasksLoading, setTasksLoading] = React.useState(true);
    const [templatesLoading, setTemplatesLoading] = React.useState(true);
    const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = React.useState(false);
    const { status: dbStatus } = useConnection();
    const { user } = useAuth();
    
    React.useEffect(() => {
        if (!user) return;
        setTasksLoading(true);
        setTemplatesLoading(true);
        getScheduledTasks().then(tasksData => {
            setTasks(tasksData.map(t => ({...t, scheduledTime: new Date(t.scheduledTime)})));
            setTasksLoading(false);
        });
        getReportTemplates().then(templatesData => {
            setTemplates(templatesData);
            setTemplatesLoading(false);
        });
    }, [user]);

    const templatesMap = React.useMemo(() => 
        new Map(templates.map(t => [t.id, t])),
    [templates]);
    
    const loading = tasksLoading || templatesLoading;
    const showConnectionMessage = !loading && tasks.length === 0 && dbStatus !== 'connected';

    return (
        <div className="w-full">
            <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center text-2xl font-bold">
                            <CalendarClock className="mr-3 h-7 w-7 text-primary" />
                            Task Scheduler
                        </CardTitle>
                        <CardDescription>
                            A real-time list of scheduled report generations and other tasks.
                        </CardDescription>
                    </div>
                    <Button onClick={() => setIsNewTaskDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Task
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                    {loading ? (
                        <>
                            {Array.from({ length: 3 }).map((_, i) => <TaskItem key={i} loading />)}
                        </>
                    ) : showConnectionMessage ? (
                         <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center">
                            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground">Database Not Connected</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Please connect to the database to view and schedule tasks.
                            </p>
                             <Button asChild variant="secondary">
                                <Link href="/settings">
                                    <Settings className="mr-2 h-4 w-4" /> Go to Settings
                                </Link>
                            </Button>
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center">
                            <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground">No Scheduled Tasks</h3>
                            <p className="text-sm text-muted-foreground">
                                Click &quot;New Task&quot; to automate a report or process.
                            </p>
                        </div>
                    ) : (
                         <>
                            {tasks.map(task => (
                                <TaskItem 
                                    key={task.id} 
                                    task={task}
                                    template={templatesMap.get(task.templateId)} 
                                />
                            ))}
                        </>
                    )}
                    </div>
                </CardContent>
            </Card>
            {isNewTaskDialogOpen && <NewTaskDialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen} />}
        </div>
    );
}

    
