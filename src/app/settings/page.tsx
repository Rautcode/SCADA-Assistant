
'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Settings, Bell, Palette, Database, Save, Languages, Server, Wifi, WifiOff, Loader2, Mail, PlusCircle, Trash2, Activity } from 'lucide-react';
import type { SettingsFormValues, DatabaseProfile } from "@/lib/types/database";
import {
    getUserSettingsFlow,
    saveUserSettingsFlow,
    getDbSchemaFlow,
} from '@/ai/flows/settings-flow';
import { SettingsSchema } from '@/lib/types/flows';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/components/localization/localization-provider";
import { applyTheme } from "@/app/app-initializer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/components/auth/auth-provider";


export default function SettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);
    const [isFetching, setIsFetching] = React.useState(true);
    const { t, setLanguage } = useLocalization();
    
    const [dbSchema, setDbSchema] = React.useState<{ tables: string[], columns: { [key: string]: string[] } } | null>(null);
    const [isFetchingSchema, setIsFetchingSchema] = React.useState(false);
    
    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(SettingsSchema),
        defaultValues: {
            theme: "system",
            language: "en",
            notifications: { inApp: true, email: false, systemAlerts: true, reportCompletion: true },
            apiKey: "",
            databaseProfiles: [],
            activeProfileId: undefined,
            email: { smtpHost: "", smtpPort: 587, smtpUser: "", smtpPass: "" }
        },
    });

    const activeProfileId = form.watch("activeProfileId");
    const databaseProfiles = form.watch("databaseProfiles") || [];
    const activeProfile = databaseProfiles.find(p => p.id === activeProfileId);
    
    React.useEffect(() => {
        setDbSchema(null);
    }, [activeProfileId]);


    React.useEffect(() => {
        if (!user) return;
        setIsFetching(true);
        async function fetchSettings() {
            try {
                const settings = await getUserSettingsFlow();
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
        setIsLoading(true);
        try {
            const result = await saveUserSettingsFlow(values);

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

     const handleSaveAndSetActive = async (profileId: string) => {
        form.setValue('activeProfileId', profileId);
        await form.handleSubmit(onSubmit)();
    };

    const handleCreateNewProfile = () => {
        const newProfile: DatabaseProfile = {
            id: `profile_${Date.now()}`, // Simple unique ID
            name: `New Profile ${databaseProfiles.length + 1}`,
        };
        const newProfiles = [...databaseProfiles, newProfile];
        form.setValue('databaseProfiles', newProfiles);
        handleSaveAndSetActive(newProfile.id);
    };

    const handleDeleteProfile = (profileId: string) => {
        const newProfiles = databaseProfiles.filter(p => p.id !== profileId);
        form.setValue('databaseProfiles', newProfiles);
        // If the deleted profile was the active one, set a new active one
        if (activeProfileId === profileId) {
            const newActiveId = newProfiles.length > 0 ? newProfiles[0].id : undefined;
            form.setValue('activeProfileId', newActiveId);
        }
        form.handleSubmit(onSubmit)(); // Save changes immediately
    };
    
    
    async function handleFetchSchema() {
        setIsFetchingSchema(true);
        // Save settings before fetching schema to ensure backend has the latest config
        await form.handleSubmit(onSubmit)();

        try {
            const schema = await getDbSchemaFlow();
            setDbSchema(schema);
            toast({ title: "Schema Fetched", description: `Found ${schema.tables.length} tables.` });
        } catch (error: any) {
            toast({ title: "Schema Fetch Failed", description: error.message, variant: "destructive" });
            setDbSchema(null);
        } finally {
            setIsFetchingSchema(false);
        }
    }

    const renderFormContent = () => {
        if (isFetching) {
            return (
                <div className="space-y-8 mt-6">
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            )
        }
        
        const activeProfileIndex = databaseProfiles.findIndex(p => p.id === activeProfileId);

        return (
            <Tabs defaultValue="appearance" className="flex flex-col md:flex-row gap-8" orientation="vertical">
                <TabsList className="md:w-56 h-auto flex-col items-start p-2 shrink-0 w-full">
                    <TabsTrigger value="appearance" className="w-full justify-start text-base py-2"><Palette className="mr-2 h-5 w-5" />{t('appearance')}</TabsTrigger>
                    <TabsTrigger value="notifications" className="w-full justify-start text-base py-2"><Bell className="mr-2 h-5 w-5" />{t('notifications')}</TabsTrigger>
                    <TabsTrigger value="integrations" className="w-full justify-start text-base py-2"><Server className="mr-2 h-5 w-5" />{t('integrations')}</TabsTrigger>
                    <TabsTrigger value="database" className="w-full justify-start text-base py-2"><Database className="mr-2 h-5 w-5" />Database Profiles</TabsTrigger>
                    <TabsTrigger value="email" className="w-full justify-start text-base py-2"><Mail className="mr-2 h-5 w-5" />{t('email')}</TabsTrigger>
                </TabsList>
                
                <div className="flex-1">
                    <TabsContent value="appearance">
                        <Card>
                            <CardHeader><CardTitle>{t('appearance')}</CardTitle><CardDescription>{t('theme_description')}</CardDescription></CardHeader>
                            <CardContent className="space-y-8">
                                <FormField control={form.control} name="theme" render={({ field }) => (<FormItem><FormLabel>{t('theme')}</FormLabel><Select onValueChange={(value) => { field.onChange(value); applyTheme(value); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('select_theme')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="light">{t('light')}</SelectItem><SelectItem value="dark">{t('dark')}</SelectItem><SelectItem value="system">{t('system_default')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="language" render={({ field }) => (<FormItem><FormLabel className="flex items-center"><Languages className="mr-2 h-4 w-4" /> {t('language')}</FormLabel><Select onValueChange={(value) => { field.onChange(value); setLanguage(value); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('select_language')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="en">English (US)</SelectItem><SelectItem value="hi">Hindi (हिन्दी)</SelectItem><SelectItem value="de">Deutsch</SelectItem><SelectItem value="es">Español</SelectItem></SelectContent></Select><FormDescription>{t('language_description')}</FormDescription><FormMessage /></FormItem>)} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="notifications">
                        <Card>
                            <CardHeader><CardTitle>{t('notifications')}</CardTitle><CardDescription>Manage how you receive alerts.</CardDescription></CardHeader>
                            <CardContent className="space-y-8">
                                <div className="space-y-4 rounded-lg border p-4">
                                    <h3 className="text-lg font-medium">{t('notification_channels')}</h3>
                                    <FormField control={form.control} name="notifications.inApp" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><div className="space-y-0.5"><FormLabel className="text-base">{t('in_app_notifications')}</FormLabel><FormDescription>Receive notifications within the application.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="notifications.email" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><div className="space-y-0.5"><FormLabel className="text-base">{t('email_notifications')}</FormLabel><FormDescription>Receive notifications via email.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                                </div>
                                <div className="space-y-4 rounded-lg border p-4">
                                    <h3 className="text-lg font-medium">{t('event_based_notifications')}</h3>
                                    <FormField control={form.control} name="notifications.systemAlerts" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><div className="space-y-0.5"><FormLabel className="text-base">{t('critical_system_alerts')}</FormLabel><FormDescription>Get notified about critical system-level events.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="notifications.reportCompletion" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between"><div className="space-y-0.5"><FormLabel className="text-base">{t('report_generation_complete')}</FormLabel><FormDescription>Get notified when a scheduled report is ready.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="integrations">
                         <Card>
                            <CardHeader><CardTitle>{t('integrations')}</CardTitle><CardDescription>Manage third-party service integrations.</CardDescription></CardHeader>
                            <CardContent className="space-y-8">
                                <FormField control={form.control} name="apiKey" render={({ field }) => (<FormItem><FormLabel>Gemini API Key</FormLabel><FormControl><Input type="password" placeholder={t('api_key_placeholder')} {...field} value={field.value || ''} /></FormControl><FormDescription>{t('api_key_description')} This is required for all AI features.</FormDescription><FormMessage /></FormItem>)} />
                                <Alert>
                                    <Activity className="h-4 w-4" />
                                    <AlertTitle>Check API Key Status</AlertTitle>
                                    <AlertDescription>
                                        You can verify if your API key is working correctly on the <Link href="/health-check" className="font-semibold text-primary hover:underline">Health Check page</Link>.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </TabsContent>

                     <TabsContent value="database">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Database Profiles</CardTitle>
                                    <Button type="button" size="sm" variant="outline" onClick={handleCreateNewProfile}><PlusCircle className="mr-2 h-4 w-4" />New Profile</Button>
                                </div>
                                <CardDescription>Manage connection profiles for different databases (e.g., Staging, Production).</CardDescription>
                                
                                {databaseProfiles.length > 0 && (
                                    <FormField
                                        control={form.control}
                                        name="activeProfileId"
                                        render={({ field }) => (
                                        <FormItem className="pt-4">
                                            <FormLabel>Active Profile</FormLabel>
                                            <Select onValueChange={(id) => handleSaveAndSetActive(id)} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a profile" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {databaseProfiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                        )}
                                    />
                                )}
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {activeProfileIndex !== -1 ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                             <h3 className="text-lg font-semibold">Editing: {activeProfile?.name}</h3>
                                        </div>
                                       
                                        <FormField control={form.control} name={`databaseProfiles.${activeProfileIndex}.name`} render={({ field }) => ( <FormItem><FormLabel>Profile Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                        <FormField control={form.control} name={`databaseProfiles.${activeProfileIndex}.server`} render={({ field }) => (<FormItem><FormLabel>Server Address</FormLabel><FormControl><Input placeholder="e.g., 192.168.1.100 or Driver={...}" {...field} value={field.value || ''} /></FormControl><FormDescription>Provide a server name or a full ODBC/SQL connection string.</FormDescription></FormItem>)} />
                                        <FormField control={form.control} name={`databaseProfiles.${activeProfileIndex}.databaseName`} render={({ field }) => ( <FormItem><FormLabel>Database Name</FormLabel><FormControl><Input placeholder="e.g., WinCC_Tag_Logging" {...field} value={field.value || ''}/></FormControl><FormDescription>Required if not using a full connection string.</FormDescription></FormItem>)} />
                                        <FormField control={form.control} name={`databaseProfiles.${activeProfileIndex}.user`} render={({ field }) => (<FormItem><FormLabel>Database User</FormLabel><FormControl><Input placeholder="e.g., report_user (optional)" {...field} value={field.value || ''}/></FormControl><FormDescription>Optional. Can be used with a connection string if it does not contain credentials.</FormDescription></FormItem>)} />
                                        <FormField control={form.control} name={`databaseProfiles.${activeProfileIndex}.password`} render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="(optional)" {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                                        <CardFooter className="px-0 pb-0 pt-4 flex-col items-start gap-4">
                                            <div className="flex gap-2">
                                                 <Button asChild type="button" variant="outline">
                                                    <Link href="/health-check"><Activity className="mr-2 h-4 w-4" />Test Connection</Link>
                                                 </Button>
                                                <Button type="button" variant="destructive" size="icon" onClick={() => handleDeleteProfile(activeProfileId!)} disabled={databaseProfiles.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                             <Alert>
                                                <Database className="h-4 w-4" />
                                                <AlertTitle>Data Mapping</AlertTitle>
                                                <AlertDescription>Map your database columns to the fields required by the application. First, save your settings, ensure the connection is operational via the Health Check page, then fetch the schema.</AlertDescription>
                                            </Alert>
                                            <Button type="button" className="w-full" onClick={handleFetchSchema} disabled={isFetchingSchema}><Database className="mr-2 h-4 w-4"/>Fetch Schema</Button>
                                            {isFetchingSchema && <Skeleton className="h-48 w-full" />}
                                            {dbSchema && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t w-full">
                                                    <FormField control={form.control} name={`databaseProfiles.${activeProfileIndex}.mapping.table`} render={({ field }) => (<FormItem><FormLabel>Table</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a table" /></SelectTrigger></FormControl><SelectContent>{dbSchema.tables.map(table => <SelectItem key={table} value={table}>{table}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                    <FormField control={form.control} name={`databaseProfiles.${activeProfileIndex}.mapping.timestampColumn`} render={({ field }) => (<FormItem><FormLabel>Timestamp Column</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!activeProfile?.mapping?.table}><FormControl><SelectTrigger><SelectValue placeholder="Map timestamp" /></SelectTrigger></FormControl><SelectContent>{dbSchema.columns[activeProfile?.mapping?.table || '']?.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                    <FormField control={form.control} name={`databaseProfiles.${activeProfileIndex}.mapping.machineColumn`} render={({ field }) => (<FormItem><FormLabel>Machine/Server Column</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!activeProfile?.mapping?.table}><FormControl><SelectTrigger><SelectValue placeholder="Map machine name" /></SelectTrigger></FormControl><SelectContent>{dbSchema.columns[activeProfile?.mapping?.table || '']?.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                    <FormField control={form.control} name={`databaseProfiles.${activeProfileIndex}.mapping.parameterColumn`} render={({ field }) => (<FormItem><FormLabel>Parameter/Tag Name Column</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!activeProfile?.mapping?.table}><FormControl><SelectTrigger><SelectValue placeholder="Map tag name" /></SelectTrigger></FormControl><SelectContent>{dbSchema.columns[activeProfile?.mapping?.table || '']?.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                    <FormField control={form.control} name={`databaseProfiles.${activeProfileIndex}.mapping.valueColumn`} render={({ field }) => (<FormItem><FormLabel>Value Column</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!activeProfile?.mapping?.table}><FormControl><SelectTrigger><SelectValue placeholder="Map tag value" /></SelectTrigger></FormControl><SelectContent>{dbSchema.columns[activeProfile?.mapping?.table || '']?.map(col => <SelectItem key={col} value={col}>{col}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                </div>
                                            )}
                                        </CardFooter>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                                        <p className="text-muted-foreground">No profiles created. Click "New Profile" to begin.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="email">
                        <Card>
                             <CardHeader><CardTitle>{t('smtp_settings')}</CardTitle><CardDescription>{t('smtp_description')}</CardDescription></CardHeader>
                            <CardContent className="space-y-6">
                                <FormField control={form.control} name="email.smtpHost" render={({ field }) => (<FormItem><FormLabel>SMTP Host</FormLabel><FormControl><Input placeholder="e.g., smtp.gmail.com" {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="email.smtpPort" render={({ field }) => (<FormItem><FormLabel>SMTP Port</FormLabel><FormControl><Input type="number" placeholder="e.g., 587" {...field} value={field.value || ''} onChange={e => field.onChange(parseInt(e.target.value, 10))}/></FormControl></FormItem>)} />
                                <FormField control={form.control} name="email.smtpUser" render={({ field }) => (<FormItem><FormLabel>SMTP Username</FormLabel><FormControl><Input placeholder="e.g., your-email@example.com" {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="email.smtpPass" render={({ field }) => (<FormItem><FormLabel>SMTP Password</FormLabel><FormControl><Input type="password" {...field} value={field.value || ''}/></FormControl></FormItem>)} />
                                 <Alert>
                                    <Activity className="h-4 w-4" />
                                    <AlertTitle>Check SMTP Status</AlertTitle>
                                    <AlertDescription>
                                        You can verify your SMTP connection on the <Link href="/health-check" className="font-semibold text-primary hover:underline">Health Check page</Link>.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
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
