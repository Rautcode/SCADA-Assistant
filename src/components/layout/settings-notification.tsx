
"use client";

import * as React from 'react';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { KeyRound, Settings, WifiOff } from 'lucide-react';
import { getUserSettingsFlow } from '@/ai/flows/settings-flow';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '../auth/auth-provider';
import { UserSettings } from '@/lib/types/database';

export function SettingsNotification() {
    const { user, loading: authLoading } = useAuth();
    const [settings, setSettings] = React.useState<UserSettings | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        getUserSettingsFlow()
            .then(settings => {
                setSettings(settings as UserSettings | null);
            })
            .catch(err => {
                console.error("Failed to get settings for notification:", err);
            })
            .finally(() => {
                setLoading(false);
            });
            
    }, [user, authLoading]);

    if (loading || authLoading) {
        return <Skeleton className="h-24 w-full mb-6" />;
    }

    if (!user) {
        return null;
    }

    const isApiKeyMissing = !settings?.apiKey;
    
    // Check for new multi-profile config
    const activeProfile = settings?.databaseProfiles?.find(p => p.id === settings.activeProfileId);
    let isDbConfigMissing = !activeProfile || !activeProfile.server || !activeProfile.databaseName || !activeProfile.mapping?.table;

    // **FIX**: If new config is missing, also check for a valid OLD config to support migrating users.
    if (isDbConfigMissing && settings?.database) {
        isDbConfigMissing = !settings.database.server || !settings.database.databaseName || !settings.dataMapping?.table;
    }


    if (!isApiKeyMissing && !isDbConfigMissing) {
        return null;
    }

    return (
        <div className="space-y-4 mb-6">
            {isApiKeyMissing && (
                 <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary">Set Your API Key to Enable AI Features</AlertTitle>
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                        To use powerful AI features like report generation and chart styling, please add your Gemini API key in the settings.
                        <Button asChild variant="link" className="p-0 h-auto ml-1 text-primary">
                            <Link href="/settings">
                                <Settings className="mr-2 h-4 w-4" /> Go to Settings
                            </Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}
             {isDbConfigMissing && (
                <Alert variant="destructive">
                    <WifiOff className="h-4 w-4" />
                    <AlertTitle>Database Not Configured</AlertTitle>
                    <AlertDescription>
                        The active database profile is incomplete. Live data is unavailable.
                         <Button asChild variant="link" size="sm" className="p-0 h-auto mt-1 ml-1 font-semibold text-destructive/80 hover:text-destructive dark:text-destructive-foreground/80 dark:hover:text-destructive-foreground">
                            <Link href="/settings">
                                <Settings className="mr-2 h-4 w-4" /> Go to Settings
                            </Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
