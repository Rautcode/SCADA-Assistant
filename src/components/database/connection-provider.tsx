
"use client";

import * as React from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { getUserSettings } from '@/app/actions/settings-actions';
import { testScadaConnection } from '@/app/actions/scada-actions';
import type { ScadaDbCredentials } from '@/app/actions/scada-actions';

type ConnectionStatus = 'loading' | 'connected' | 'error' | 'unconfigured';

interface ConnectionContextType {
    status: ConnectionStatus;
    error: string | null;
    loading: boolean;
    refetch: () => void;
}

const ConnectionContext = React.createContext<ConnectionContextType | undefined>(undefined);

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [status, setStatus] = React.useState<ConnectionStatus>('loading');
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);

    const testConnection = React.useCallback(async () => {
        if (!user) {
            // If there's no user, we are not strictly unconfigured, but we can't connect.
            // 'loading' is a safe state until user status is resolved.
            setStatus('loading');
            setLoading(true);
            return;
        }

        setLoading(true);
        setStatus('loading');
        setError(null);

        try {
            const settings = await getUserSettings({ userId: user.uid });
            const dbSettings = settings?.database;

            if (!dbSettings?.server || !dbSettings?.databaseName) {
                setStatus('unconfigured');
                setError("Database server or name not configured.");
                return;
            }
            
            // Explicitly create the credentials object to pass to the server action
            const dbCreds: ScadaDbCredentials = {
                server: dbSettings.server,
                databaseName: dbSettings.databaseName,
                user: dbSettings.user,
                password: dbSettings.password,
            };

            const result = await testScadaConnection({ dbCreds });

            if (result.success) {
                setStatus('connected');
                setError(null);
            } else {
                setStatus('error');
                setError(result.error || 'An unknown error occurred.');
            }
        } catch (err: any) {
            setStatus('error');
            setError(err.message || 'Failed to fetch settings and test connection.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    React.useEffect(() => {
        testConnection();
    }, [user, testConnection]);

    const value = {
        status,
        error,
        loading,
        refetch: testConnection,
    };

    return (
        <ConnectionContext.Provider value={value}>
            {children}
        </ConnectionContext.Provider>
    );
}

export function useConnection() {
    const context = React.useContext(ConnectionContext);
    if (context === undefined) {
        throw new Error('useConnection must be used within a ConnectionProvider');
    }
    return context;
}
