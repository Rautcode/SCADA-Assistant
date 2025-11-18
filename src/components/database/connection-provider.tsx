
"use client";

import * as React from 'react';
import { getUserSettings } from '@/app/actions/settings-actions';
import { testScadaConnection } from '@/app/actions/scada-actions';
import { useAuth } from '../auth/auth-provider';

type ConnectionStatus = 'loading' | 'connected' | 'error' | 'unconfigured';

interface ConnectionContextType {
    status: ConnectionStatus;
    error: string | null;
    loading: boolean;
    refetch: () => void;
}

const ConnectionContext = React.createContext<ConnectionContextType | undefined>(undefined);

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [status, setStatus] = React.useState<ConnectionStatus>('loading');
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);

    const testConnection = React.useCallback(async () => {
        if (authLoading) {
            setStatus('loading');
            setLoading(true);
            return;
        }
        if (!user) {
            setStatus('unconfigured');
            setLoading(false);
            setError("User not authenticated.");
            return;
        }

        setLoading(true);
        setStatus('loading');
        setError(null);

        try {
            // This action is authenticated and fetches settings securely on the server
            const settings = await getUserSettings();

            if (!settings?.database?.server || !settings?.database?.databaseName) {
                setStatus('unconfigured');
                setError("Database server or name not configured.");
                return;
            }

            // This action is also authenticated and uses the settings from the DB.
            const result = await testScadaConnection();

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
    }, [user, authLoading]);

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
