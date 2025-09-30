
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarClock, PlusCircle, AlertTriangle, FileText, CheckCircle2, XCircle, Timer } from 'lucide-react';
import { onScheduledTasks, onReportTemplates } from '@/services/database-service';
import type { ScheduledTask, ReportTemplate } from '@/lib/types/database';
import { Unsubscribe } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NewTaskDialog } from '@/components/scheduler/new-task-dialog';
import Image from 'next/image';

const statusConfig = {
    scheduled: { icon: Timer, color: "bg-blue-500", label: "Scheduled" },
    completed: { icon: CheckCircle2, color: "bg-green-500", label: "Completed" },
    failed: { icon: XCircle, color: "bg-red-500", label: "Failed" },
    overdue: { icon: AlertTriangle, color: "bg-yellow-500", label: "Overdue" },
};

const TaskItem = ({ task, template, loading }: { task?: ScheduledTask, template?: ReportTemplate, loading?: boolean }) => {
    if (loading || !task) {
        return (
            <Card className="shadow-sm">
                <CardHeader>
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
                     <Skeleton className="h-6 w-24" />
                </CardContent>
            </Card>
        )
    }

    const { icon: Icon, color, label } = statusConfig[task.status];

    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg">{task.name}</CardTitle>
                <CardDescription>
                    Scheduled for: {format(task.scheduledTime, 'PPpp')}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {template ? (
                         <Image src={template.thumbnailUrl} alt={template.name} width={50} height={50} className="rounded-md border aspect-video object-cover" />
                    ): (
                        <div className="h-12 w-12 flex items-center justify-center bg-muted rounded-md">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                    )}
                    <div>
                        <p className="font-semibold text-sm text-foreground">{template?.name || "Template not found"}</p>
                        <p className="text-xs text-muted-foreground">{template?.category}</p>
                    </div>
                </div>
                 <Badge className={cn("text-white flex-shrink-0", color)}>
                    <Icon className="mr-2 h-4 w-4" />
                    {label}
                </Badge>
            </CardContent>
        </Card>
    );
};

export default function SchedulerPage() {
    const [tasks, setTasks] = React.useState<ScheduledTask[]>([]);
    const [templates, setTemplates] = React.useState<ReportTemplate[]>([]);
    const [tasksLoading, setTasksLoading] = React.useState(true);
    const [templatesLoading, setTemplatesLoading] = React.useState(true);
    const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = React.useState(false);
    
    React.useEffect(() => {
        const unsubTasks: Unsubscribe = onScheduledTasks(tasksData => {
            setTasks(tasksData);
            setTasksLoading(false);
        });
        
        const unsubTemplates: Unsubscribe = onReportTemplates(templatesData => {
            setTemplates(templatesData);
            setTemplatesLoading(false);
        });

        return () => {
            unsubTasks();
            unsubTemplates();
        }
    }, []);

    const templatesMap = React.useMemo(() => 
        new Map(templates.map(t => [t.id, t])),
    [templates]);
    
    const loading = tasksLoading || templatesLoading;

    return (
        <div className="container mx-auto py-8">
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
                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => <TaskItem key={i} loading />)}
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
                         <div className="space-y-4">
                            {tasks.map(task => (
                                <TaskItem 
                                    key={task.id} 
                                    task={task}
                                    template={templatesMap.get(task.templateId)} 
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            <NewTaskDialog open={isNewTaskDialogOpen} onOpenChange={setIsNewTaskDialogOpen} />
        </div>
    );
}
