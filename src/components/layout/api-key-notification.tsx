
"use client";

import * as React from 'react';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { KeyRound, Settings } from 'lucide-react';
import { getUserSettingsFlow } from '@/ai/flows/settings-flow';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '../auth/auth-provider';

export function ApiKeyNotification() {
    const { user, loading: authLoading } = useAuth();
    const [apiKey, setApiKey] = React.useState<string | undefined>(undefined);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (authLoading) {
            return;
        }
        if (!user) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        getUserSettingsFlow()
            .then(settings => {
                setApiKey(settings?.apiKey);
            })
            .catch(err => {
                console.error("Failed to get API key for notification:", err);
            })
            .finally(() => {
                setLoading(false);
            });
            
    }, [user, authLoading]);

    if (loading || authLoading) {
        return <Skeleton className="h-24 w-full mb-6" />;
    }

    if (!user || apiKey) {
        return null;
    }

    return (
        <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
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
    );
}
