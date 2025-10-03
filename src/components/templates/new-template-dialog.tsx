
"use client";

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createNewTemplate } from '@/ai/flows/template-flow';

const NewTemplateSchema = z.object({
    name: z.string().min(1, "Template name is required."),
    description: z.string().min(1, "Description is required."),
    category: z.string().min(1, "Category is required."),
    thumbnailUrl: z.string().url("A valid thumbnail URL is required."),
});

interface NewTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTemplateDialog({ open, onOpenChange }: NewTemplateDialogProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);

    const form = useForm<z.infer<typeof NewTemplateSchema>>({
        resolver: zodResolver(NewTemplateSchema),
        defaultValues: {
            name: "",
            description: "",
            category: "",
            thumbnailUrl: "https://picsum.photos/seed/tech_document/300/200",
        },
    });
    
    async function onSubmit(values: z.infer<typeof NewTemplateSchema>) {
        setIsLoading(true);
        try {
            await createNewTemplate(values);
            toast({
                title: "Template Created",
                description: "The new report template has been successfully created.",
            });
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to create template:", error);
            toast({
                title: "Creation Failed",
                description: "An error occurred while creating the template.",
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
                    <DialogTitle>Create New Report Template</DialogTitle>
                    <DialogDescription>
                        Define a new template for generating reports.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Template Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 'Monthly Maintenance Report'" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., 'Maintenance'" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="A brief description of what this template is for." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="thumbnailUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Thumbnail URL</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Creating..." : "Create Template"}
                            </Button>
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
    )
}
