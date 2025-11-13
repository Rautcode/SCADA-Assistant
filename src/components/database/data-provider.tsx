
"use client";

import * as React from 'react';
import { onMachines, onReportTemplates } from '@/services/client-database-service';
import type { Machine, ReportTemplate } from '@/lib/types/database';
import { Unsubscribe } from 'firebase/firestore';

interface DataContextType {
    machines: Machine[];
    templates: ReportTemplate[];
    loading: boolean;
}

const DataContext = React.createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [machines, setMachines] = React.useState<Machine[]>([]);
    const [templates, setTemplates] = React.useState<ReportTemplate[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        setLoading(true);

        const unsubscribers: Unsubscribe[] = [];

        unsubscribers.push(onMachines(machinesData => {
            setMachines(machinesData);
            setLoading(false);
        }));

        unsubscribers.push(onReportTemplates(templatesData => {
            setTemplates(templatesData);
            setLoading(false);
        }));

        // Fallback to stop loading indicator
        const timer = setTimeout(() => {
            if (loading) {
                setLoading(false);
            }
        }, 5000);

        return () => {
            unsubscribers.forEach(unsub => unsub());
            clearTimeout(timer);
        };
    }, []);

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
