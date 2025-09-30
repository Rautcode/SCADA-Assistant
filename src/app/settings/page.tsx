
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Settings, Bell, Palette, Database, Save, Languages, Server, Wifi, WifiOff, Loader2, Mail } from 'lucide-react';
import type { SettingsFormValues } from "@/lib/types/database";
import { settingsSchema } from "@/lib/types/database";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { testScadaConnection, testSmtpConnection, getUserSettings, saveUserSettings } from "@/app/actions/scada-actions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useConnection } from "@/components/database/connection-provider";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { ToastAction } from "@/components/ui/toast";
import { useLocalization } from "@/components/localization/localization-provider";

type ConnectionStatus = 'unknown' | 'testing' | 'success' | 'error';


export default function SettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { refetch: refetchDbStatus } = useConnection();
    const [isLoading, setIsLoading] = React.useState(false);
    const [isFetching, setIsFetching] = React.useState(true);
    const { setOpen: setAssistantOpen } = useAssistant();
    const { t, setLanguage } = useLocalization();
    
    const [dbConnectionStatus, setDbConnectionStatus] = React.useState<ConnectionStatus>('unknown');
    const [isTestingDbConnection, setIsTestingDbConnection] = React.useState(false);

    const [smtpConnectionStatus, setSmtpConnectionStatus] = React.useState<ConnectionStatus>('unknown');
    const [isTestingSmtpConnection, setIsTestingSmtpConnection] = React.useState(false);

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            theme: "system",
            language: "en",
            notifications: {
                inApp: true,
                email: false,
                systemAlerts: true,
                reportCompletion: true,
            },
            syncFrequency: "5",
            apiKey: "",
            database: {
                server: "",
                dbName: "",
                user: "",
                password: "",
            },
            email: {
                smtpHost: "",
                smtpPort: 587,
                smtpUser: "",
                smtpPass: "",
            }
        },
    });

    React.useEffect(() => {
        if (!user) return;
        setIsFetching(true);
        getUserSettings({ userId: user.uid })
            .then(settings => {
                if (settings) {
                    form.reset(settings);
                    if (settings.language) {
                        setLanguage(settings.language);
                    }
                } else {
                    // Apply default if no settings found
                    form.reset(form.formState.defaultValues);
                }
            })
            .catch(err => {
                 console.error("Failed to fetch settings:", err);
                 toast({ 
                    title: "Error: Could not fetch your settings.", 
                    description: "The application could not retrieve your saved settings. The AI can help you troubleshoot.", 
                    variant: "destructive",
                    action: <ToastAction altText="Ask AI for help" onClick={() => setAssistantOpen(true)}>Ask AI</ToastAction>
                });
            })
            .finally(() => setIsFetching(false));

    }, [user, form, toast, setAssistantOpen, setLanguage]);

    function applyTheme(theme: string) {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
    }

    async function onSubmit(values: SettingsFormValues) {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to save settings.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            await saveUserSettings({ userId: user.uid, settings: values });
            toast({
                title: t('settings_saved_title'),
                description: t('settings_saved_description'),
            });
            // Update theme immediately after saving
            if (values.theme) {
                applyTheme(values.theme);
            }
            // Update language
            if (values.language) {
                setLanguage(values.language);
            }
            // Refetch global DB status after saving new credentials
            refetchDbStatus();
        } catch (error) {
             console.error("Failed to save settings:", error);
             toast({ title: "Error", description: "Could not save your settings.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    
    async function handleTestDbConnection() {
        const dbCreds = form.getValues('database');
        if (!dbCreds?.server || !dbCreds?.dbName) {
            toast({
                title: "Missing Information",
                description: "Please provide a server address and database name.",
                variant: "destructive"
            });
            return;
        }

        setIsTestingDbConnection(true);
        setDbConnectionStatus('testing');

        try {
            const result = await testScadaConnection({ dbCreds });
            if (result.success) {
                setDbConnectionStatus('success');
                toast({
                    title: "Connection Successful",
                    description: "Successfully connected to the SCADA database.",
                });
            } else {
                setDbConnectionStatus('error');
                toast({
                    title: "Connection Failed",
                    description: result.error || "An unknown error occurred.",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            setDbConnectionStatus('error');
            toast({
                title: "Connection Failed",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsTestingDbConnection(false);
        }
    }
    
    async function handleTestSmtpConnection() {
        const emailCreds = form.getValues('email');
        if (!emailCreds?.smtpHost || !emailCreds?.smtpPort || !emailCreds?.smtpUser) {
            toast({
                title: "Missing Information",
                description: "Please provide SMTP host, port, and user.",
                variant: "destructive"
            });
            return;
        }

        setIsTestingSmtpConnection(true);
        setSmtpConnectionStatus('testing');

        try {
            const result = await testSmtpConnection({ emailCreds });
            if (result.success) {
                setSmtpConnectionStatus('success');
                toast({
                    title: "SMTP Connection Successful",
                    description: "Successfully connected to the SMTP server.",
                });
            } else {
                setSmtpConnectionStatus('error');
                toast({
                    title: "SMTP Connection Failed",
                    description: result.error || "An unknown error occurred.",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            setSmtpConnectionStatus('error');
            toast({
                title: "SMTP Connection Failed",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsTestingSmtpConnection(false);
        }
    }


    const ConnectionStatusBadge = ({ status }: { status: ConnectionStatus}) => {
        switch(status) {
            case 'success':
                return <Badge variant="default" className="bg-green-500 text-white"><Wifi className="mr-1 h-4 w-4" />{t('connected')}</Badge>;
            case 'error':
                return <Badge variant="destructive"><WifiOff className="mr-1 h-4 w-4" />{t('connection_failed')}</Badge>;
            case 'testing':
                return <Badge variant="secondary"><Loader2 className="mr-1 h-4 w-4 animate-spin" />{t('testing')}</Badge>;
            default:
                return <Badge variant="outline">{t('untested')}</Badge>;
        }
    };


    const renderFormContent = () => {
        if (isFetching) {
            return (
                <div className="space-y-8 mt-6">
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-4">
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-4">
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            )
        }
        return (
            <Tabs defaultValue="appearance" className="w-full">
                <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto">
                    <TabsTrigger value="appearance"><Palette className="mr-2 h-4 w-4" />{t('appearance')}</TabsTrigger>
                    <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" />{t('notifications')}</TabsTrigger>
                    <TabsTrigger value="data"><Database className="mr-2 h-4 w-4" />{t('data_integrations')}</TabsTrigger>
                    <TabsTrigger value="database"><Server className="mr-2 h-4 w-4" />{t('database')}</TabsTrigger>
                    <TabsTrigger value="email"><Mail className="mr-2 h-4 w-4" />{t('email')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="appearance" className="mt-6">
                    <div className="space-y-8">
                        <FormField
                            control={form.control}
                            name="theme"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('theme')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('select_theme')} />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="light">{t('light')}</SelectItem>
                                            <SelectItem value="dark">{t('dark')}</SelectItem>
                                            <SelectItem value="system">{t('system_default')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>{t('theme_description')}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="language"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center"><Languages className="mr-2 h-4 w-4" /> {t('language')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('select_language')} />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="en">English (US)</SelectItem>
                                            <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                                            <SelectItem value="de">Deutsch</SelectItem>
                                            <SelectItem value="es">Español</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>{t('language_description')}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </TabsContent>
                
                <TabsContent value="notifications" className="mt-6">
                     <div className="space-y-8">
                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="text-lg font-medium">{t('notification_channels')}</h3>
                            <FormField
                                control={form.control}
                                name="notifications.inApp"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between">
                                        <FormLabel>{t('in_app_notifications')}</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="notifications.email"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between">
                                        <FormLabel>{t('email_notifications')}</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                         <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="text-lg font-medium">{t('event_based_notifications')}</h3>
                            <FormField
                                control={form.control}
                                name="notifications.systemAlerts"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between">
                                        <FormLabel>{t('critical_system_alerts')}</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="notifications.reportCompletion"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between">
                                        <FormLabel>{t('report_generation_complete')}</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="data" className="mt-6">
                    <div className="space-y-8">
                        <FormField
                            control={form.control}
                            name="syncFrequency"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('data_sync_frequency')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('select_sync_frequency')} />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="1">{t('every_minute')}</SelectItem>
                                            <SelectItem value="5">{t('every_5_minutes')}</SelectItem>
                                            <SelectItem value="15">{t('every_15_minutes')}</SelectItem>
                                            <SelectItem value="manual">{t('manual_only')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>{t('data_sync_description')}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="apiKey"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>API Key</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder={t('api_key_placeholder')} {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormDescription>
                                        {t('api_key_description')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </TabsContent>
                <TabsContent value="database" className="mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>{t('scada_db_connection')}</CardTitle>
                                    <CardDescription>{t('scada_db_description')}</CardDescription>
                                </div>
                                <ConnectionStatusBadge status={dbConnectionStatus} />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <FormField
                                control={form.control}
                                name="database.server"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('server_address')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 192.168.1.100 or scada.myserver.com" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="database.dbName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('database_name')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., WinCC_Tag_Logging" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="database.user"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('database_user')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., report_user" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="database.password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('password')}</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} value={field.value || ''}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                             <Button type="button" variant="outline" onClick={handleTestDbConnection} disabled={isTestingDbConnection}>
                                {isTestingDbConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}
                                {t('test_connection')}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
                <TabsContent value="email" className="mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>{t('smtp_settings')}</CardTitle>
                                    <CardDescription>{t('smtp_description')}</CardDescription>
                                </div>
                                <ConnectionStatusBadge status={smtpConnectionStatus} />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <FormField
                                control={form.control}
                                name="email.smtpHost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SMTP Host</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., smtp.gmail.com" {...field} value={field.value || ''} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="email.smtpPort"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SMTP Port</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 587" {...field} value={field.value || ''} onChange={e => field.onChange(parseInt(e.target.value, 10))}/>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="email.smtpUser"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SMTP Username</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., your-email@example.com" {...field} value={field.value || ''} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email.smtpPass"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SMTP Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} value={field.value || ''}/>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                             <Button type="button" variant="outline" onClick={handleTestSmtpConnection} disabled={isTestingSmtpConnection}>
                                {isTestingSmtpConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                {t('test_connection')}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        )
    }

    return (
        <div className="animate-fade-in">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card className="shadow-lg">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="flex items-center text-2xl font-bold">
                                        <Settings className="mr-3 h-7 w-7 text-primary" />
                                        {t('app_settings')}
                                    </CardTitle>
                                    <CardDescription>{t('settings_description')}</CardDescription>
                                </div>
                                <Button type="submit" disabled={isLoading || isFetching}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isLoading ? t('saving') : t('save_all')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                           {renderFormContent()}
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </div>
    );
}

    