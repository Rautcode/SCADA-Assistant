
'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Settings, Bell, Palette, Database, Save, Languages, Server, Wifi, WifiOff, Loader2, Mail, Map, Workflow } from 'lucide-react';
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
import { Skeleton } from "@/components/ui/skeleton";
import { testScadaConnection, getDbSchema, testSmtpConnection, saveUserSettings, getUserSettings } from "@/app/actions/settings-actions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/components/localization/localization-provider";
import { applyTheme } from "@/app/app-initializer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/components/auth/auth-provider";


type ConnectionStatus = 'untested' | 'testing' | 'success' | 'error';

export default function SettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);
    const [isFetching, setIsFetching] = React.useState(true);
    const { t, setLanguage } = useLocalization();
    
    const [dbConnectionStatus, setDbConnectionStatus] = React.useState<ConnectionStatus>('untested');
    const [isTestingDbConnection, setIsTestingDbConnection] = React.useState(false);

    const [smtpConnectionStatus, setSmtpConnectionStatus] = React.useState<ConnectionStatus>('untested');
    const [isTestingSmtpConnection, setIsTestingSmtpConnection] = React.useState(false);

    const [dbSchema, setDbSchema] = React.useState<{ tables: string[], columns: { [key: string]: string[] } } | null>(null);
    const [isFetchingSchema, setIsFetchingSchema] = React.useState(false);
    
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
            apiKey: "",
            database: {
                server: "",
                databaseName: "",
                user: "",
                password: "",
            },
            dataMapping: {
                table: "",
                timestampColumn: "",
                machineColumn: "",
                parameterColumn: "",
                valueColumn: "",
            },
            email: {
                smtpHost: "",
                smtpPort: 587,
                smtpUser: "",
                smtpPass: "",
            }
        },
    });

    const selectedTable = form.watch("dataMapping.table");
    const dbCredsWatched = form.watch("database");
    const smtpCredsWatched = form.watch("email");

    React.useEffect(() => {
        if (dbConnectionStatus !== 'untested') {
            setDbConnectionStatus('untested');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dbCredsWatched]);

    React.useEffect(() => {
        if (smtpConnectionStatus !== 'untested') {
            setSmtpConnectionStatus('untested');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [smtpCredsWatched]);

    React.useEffect(() => {
        if (!user) return;
        setIsFetching(true);
        async function fetchSettings() {
            try {
                const authToken = await user.getIdToken();
                const settings = await getUserSettings({ authToken });
                if (settings) {
                    form.reset(settings);
                }
            } catch (err) {
                 console.error("Failed to fetch settings:", err);
                 toast({ 
                    title: "Error: Could not fetch your settings.", 
                    description: "The application could not retrieve your saved settings. Please check your network connection.", 
                    variant: "destructive",
                });
            } finally {
                setIsFetching(false);
            }
        }
        fetchSettings();
    }, [user, form, toast]);

    async function onSubmit(values: SettingsFormValues) {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to save settings.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const authToken = await user.getIdToken();
            const result = await saveUserSettings({ settings: values, authToken });

            if (result.success) {
                toast({
                    title: t('settings_saved_title'),
                    description: t('settings_saved_description'),
                });
                
                applyTheme(values.theme);
                setLanguage(values.language);

            } else {
                throw new Error(result.error || "Could not save your settings.");
            }
        } catch (error: any) {
             console.error("Failed to save settings:", error);
             toast({ title: "Error", description: error.message || "Could not save your settings.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
    
    async function handleTestDbConnection() {
        if (!user) return;

        setIsTestingDbConnection(true);
        setDbConnectionStatus('testing');

        // We must save the settings first for the server action to use them.
        await onSubmit(form.getValues());

        try {
            const authToken = await user.getIdToken();
            const result = await testScadaConnection({ authToken });
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
    
    async function handleFetchSchema() {
        if (!user) return;
        setIsFetchingSchema(true);
        try {
            const authToken = await user.getIdToken();
            const schema = await getDbSchema({ authToken });
            setDbSchema(schema);
            toast({ title: "Schema Fetched", description: `Found ${schema.tables.length} tables.` });
        } catch (error: any) {
            toast({ title: "Schema Fetch Failed", description: error.message, variant: "destructive" });
            setDbSchema(null);
        } finally {
            setIsFetchingSchema(false);
        }
    }

    async function handleTestSmtpConnection() {
        if (!user) return;
        setIsTestingSmtpConnection(true);
        setSmtpConnectionStatus('testing');

        // We must save the settings first for the server action to use them.
        await onSubmit(form.getValues());
        try {
            const authToken = await user.getIdToken();
            const result = await testSmtpConnection({ authToken });
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


    const ConnectionStatusBadge = React.memo(function ConnectionStatusBadge({ status }: { status: ConnectionStatus}) {
        switch(status) {
            case 'success':
                return <Badge variant="default" className="bg-green-500 hover:bg-green-500/90 text-white"><Wifi className="mr-1 h-4 w-4" />{t('connected')}</Badge>;
            case 'error':
                return <Badge variant="destructive"><WifiOff className="mr-1 h-4 w-4" />{t('connection_failed')}</Badge>;
            case 'testing':
                return <Badge variant="secondary"><Loader2 className="mr-1 h-4 w-4 animate-spin" />{t('testing')}</Badge>;
            default:
                return <Badge variant="outline">{t('untested')}</Badge>;
        }
    });

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
            <Tabs defaultValue="appearance" className="flex flex-col md:flex-row gap-8" orientation="vertical">
                <TabsList className="md:w-56 h-auto flex-col items-start p-2 shrink-0 w-full">
                    <TabsTrigger value="appearance" className="w-full justify-start text-base py-2"><Palette className="mr-2 h-5 w-5" />{t('appearance')}</TabsTrigger>
                    <TabsTrigger value="notifications" className="w-full justify-start text-base py-2"><Bell className="mr-2 h-5 w-5" />{t('notifications')}</TabsTrigger>
                    <TabsTrigger value="integrations" className="w-full justify-start text-base py-2"><Workflow className="mr-2 h-5 w-5" />{t('integrations')}</TabsTrigger>
                    <TabsTrigger value="database" className="w-full justify-start text-base py-2"><Server className="mr-2 h-5 w-5" />{t('database')}</TabsTrigger>
                    <TabsTrigger value="mapping" className="w-full justify-start text-base py-2"><Map className="mr-2 h-5 w-5" />Data Mapping</TabsTrigger>
                    <TabsTrigger value="email" className="w-full justify-start text-base py-2"><Mail className="mr-2 h-5 w-5" />{t('email')}</TabsTrigger>
                </TabsList>
                
                <div className="flex-1">
                    <TabsContent value="appearance">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('appearance')}</CardTitle>
                                <CardDescription>{t('theme_description')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <FormField
                                    control={form.control}
                                    name="theme"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('theme')}</FormLabel>
                                            <Select 
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    applyTheme(value);
                                                }}
                                                value={field.value}
                                            >
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
                                            <Select 
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    setLanguage(value);
                                                }}
                                                value={field.value}
                                            >
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
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="notifications">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('notifications')}</CardTitle>
                                <CardDescription>Manage how you receive alerts.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div className="space-y-4 rounded-lg border p-4">
                                    <h3 className="text-lg font-medium">{t('notification_channels')}</h3>
                                    <FormField
                                        control={form.control}
                                        name="notifications.inApp"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">{t('in_app_notifications')}</FormLabel>
                                                    <FormDescription>Receive notifications within the application.</FormDescription>
                                                </div>
                                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="notifications.email"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">{t('email_notifications')}</FormLabel>
                                                    <FormDescription>Receive notifications via email.</FormDescription>
                                                </div>
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
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">{t('critical_system_alerts')}</FormLabel>
                                                    <FormDescription>Get notified about critical system-level events.</FormDescription>
                                                </div>
                                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="notifications.reportCompletion"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">{t('report_generation_complete')}</FormLabel>
                                                    <FormDescription>Get notified when a scheduled report is ready.</FormDescription>
                                                </div>
                                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="integrations">
                         <Card>
                            <CardHeader>
                                <CardTitle>{t('integrations')}</CardTitle>
                                <CardDescription>Manage third-party service integrations.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <FormField
                                    control={form.control}
                                    name="apiKey"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Gemini API Key</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder={t('api_key_placeholder')} {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormDescription>
                                                {t('api_key_description')} This is required for all AI features.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="database">
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
                                    name="database.databaseName"
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
                                                <Input placeholder="e.g., report_user (optional)" {...field} value={field.value || ''} />
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
                                                <Input type="password" placeholder="(optional)" {...field} value={field.value || ''}/>
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
                    <TabsContent value="mapping">
                        <Card>
                            <CardHeader>
                                <div>
                                    <CardTitle>Data Column Mapping</CardTitle>
                                    <CardDescription>Map your database columns to the fields required by the application.</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Alert>
                                    <Database className="h-4 w-4" />
                                    <AlertTitle>Instructions</AlertTitle>
                                    <AlertDescription>
                                        This is a critical step. First, ensure your database credentials are saved and the connection test is successful. Then, click &quot;Fetch Schema&quot; to load your tables and columns. Finally, map the required columns.
                                    </AlertDescription>
                                </Alert>
                                <Button type="button" className="w-full" onClick={handleFetchSchema} disabled={isFetchingSchema || dbConnectionStatus !== 'success'}>
                                    {isFetchingSchema ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Database className="mr-2 h-4 w-4"/>}
                                    Fetch Schema
                                </Button>

                                {isFetchingSchema && <Skeleton className="h-48 w-full" />}
                                
                                {dbSchema && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="dataMapping.table"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Table</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a table" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {dbSchema.tables.map(table => <SelectItem key={table} value={table}>{table}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>Select the table containing your tag data.</FormDescription>
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                            <FormField
                                                control={form.control} name="dataMapping.timestampColumn"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Timestamp Column</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedTable}><FormControl><SelectTrigger><SelectValue placeholder="Map timestamp" /></SelectTrigger></FormControl>
                                                            <SelectContent>{dbSchema.columns[selectedTable]?.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control} name="dataMapping.machineColumn"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Machine/Server Column</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedTable}><FormControl><SelectTrigger><SelectValue placeholder="Map machine name" /></SelectTrigger></FormControl>
                                                            <SelectContent>{dbSchema.columns[selectedTable]?.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control} name="dataMapping.parameterColumn"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Parameter/Tag Name Column</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedTable}><FormControl><SelectTrigger><SelectValue placeholder="Map tag name" /></SelectTrigger></FormControl>
                                                            <SelectContent>{dbSchema.columns[selectedTable]?.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control} name="dataMapping.valueColumn"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Value Column</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedTable}><FormControl><SelectTrigger><SelectValue placeholder="Map tag value" /></SelectTrigger></FormControl>
                                                            <SelectContent>{dbSchema.columns[selectedTable]?.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="email">
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
                </div>
            </Tabs>
        );
    };

    return (
        <div className="w-full">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card className="shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between border-b">
                             <div>
                                <h1 className="flex items-center text-2xl font-bold">
                                    <Settings className="mr-3 h-7 w-7 text-primary" />
                                    {t('app_settings')}
                                </h1>
                                <p className="text-muted-foreground mt-1">{t('settings_description')}</p>
                            </div>
                            <Button type="submit" disabled={isLoading || isFetching}>
                                <Save className="mr-2 h-4 w-4" />
                                {isLoading ? t('saving') : t('save_all')}
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {renderFormContent()}
                        </CardContent>
                    </Card>
                </form>
            </Form>
        </div>
    );
}
