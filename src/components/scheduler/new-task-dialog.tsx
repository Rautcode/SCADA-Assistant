
"use client";

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/auth-provider';
import { scheduleTask } from '@/ai/flows/scheduler-flow';
import { ReportTemplate } from '@/lib/types/database';
import { ScheduleTaskInputSchema } from '@/lib/types/flows';

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ReportTemplate[];
}

// Client-side schema uses `Date` object for the picker
const NewTaskClientSchema = ScheduleTaskInputSchema.extend({
    scheduledTime: z.date(),
});


export function NewTaskDialog({ open, onOpenChange, templates }: NewTaskDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = React.useState(false);
    const [isClient, setIsClient] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    const form = useForm<z.infer<typeof NewTaskClientSchema>>({
        resolver: zodResolver(NewTaskClientSchema),
        defaultValues: {
            name: "",
            templateId: "",
            scheduledTime: new Date(),
        },
    });

    async function onSubmit(values: z.infer<typeof NewTaskClientSchema>) {
        setIsLoading(true);
        if (!user) {
            toast({
                title: "Authentication Error",
                description: "You must be logged in to schedule a task.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        try {
            await scheduleTask({
                ...values,
                scheduledTime: values.scheduledTime.toISOString(),
            });
            toast({
                title: "Task Scheduled",
                description: "The new task has been successfully scheduled.",
            });
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to schedule task:", error);
            toast({
                title: "Scheduling Failed",
                description: "An error occurred while scheduling the task.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Schedule a New Task</DialogTitle>
                    <DialogDescription>
                        Configure and schedule a new automated task, such as report generation.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Task Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 'Weekly Production Report'" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="templateId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Report Template</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a template" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {templates.map(template => (
                                                <SelectItem key={template.id} value={template.id}>
                                                    {template.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                     </FormItem>
                                <FormMessage />
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="scheduledTime"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Scheduled Time</FormLabel>
                                    {isClient && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                                >
                                                {field.value ? (
                                                    format(field.value, "PPpp")
                                                ) : (
                                                    <span>Pick a date and time</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date < new Date()}
                                                initialFocus
                                            />
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                            />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Scheduling..." : "Schedule Task"}
                            </Button>
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
    )
}
