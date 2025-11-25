'use client';

import * as React from 'react';
import { onMachines, onReportTemplates } from '@/services/client-database-service';
import type { Machine, ReportTemplate } from '@/lib/types/database';
import { Unsubscribe } from 'firebase/firestore';
import { useAuth } from '@/components/auth/auth-provider';

interface DataContextType {
    machines: Machine[];
    templates: ReportTemplate[];
    loading: boolean;
}

const DataContext = React.createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [machines, setMachines] = React.useState<Machine[]>([]);
    const [templates, setTemplates] = React.useState<ReportTemplate[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        // Only proceed if authentication is resolved and we have a user
        if (authLoading || !user) {
            setLoading(!authLoading); // Stop loading if auth is done but there's no user
            // Clear data on logout
            if (!user) {
                setMachines([]);
                setTemplates([]);
            }
            return;
        }

        setLoading(true);
        const unsubscribers: Unsubscribe[] = [];
        let machineDataLoaded = false;
        let templateDataLoaded = false;

        const checkLoadingDone = () => {
            if (machineDataLoaded && templateDataLoaded) {
                setLoading(false);
            }
        };

        // Pass the user's UID to the listeners
        unsubscribers.push(onMachines(machinesData => {
            setMachines(machinesData);
            machineDataLoaded = true;
            checkLoadingDone();
        }));

        unsubscribers.push(onReportTemplates(templatesData => {
            setTemplates(templatesData);
            templateDataLoaded = true;
            checkLoadingDone();
        }));

        const timer = setTimeout(() => {
            if (loading) setLoading(false);
        }, 5000);

        return () => {
            unsubscribers.forEach(unsub => unsub());
            clearTimeout(timer);
        };
    // Re-run this effect when the user or auth loading state changes
    }, [user, authLoading, loading]);

    const value = {
        machines,
        templates,
        loading,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = React.useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
