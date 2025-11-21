
'use client';

import { collection, query, onSnapshot, orderBy, limit, doc, Timestamp, Unsubscribe, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase'; // Direct import of client-side db
import { DashboardStats, EmailLog, Machine, RecentActivity, ReportTemplate, ScheduledTask, SystemComponentStatus, SystemLog } from '@/lib/types/database';
import { getUserSettingsFlow } from '@/ai/flows/settings-flow';

function createListener<T>(collectionName: string, callback: (data: T[]) => void, orderField?: string, count?: number): Unsubscribe {
    if (!db) {
        console.error("Firestore is not initialized. Cannot create listener.");
        callback([]);
        return () => {};
    }
    const collRef = collection(db, collectionName);
    let q;
    if (orderField && count) {
        q = query(collRef, orderBy(orderField, 'desc'), limit(count));
    } else if (orderField) {
        q = query(collRef, orderBy(orderField, 'desc'));
    } else {
        q = query(collRef);
    }
    
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => {
            const docData = doc.data();
            // Convert any Timestamps to Dates
            Object.keys(docData).forEach(key => {
                if (docData[key] instanceof Timestamp) {
                    docData[key] = docData[key].toDate();
                }
            });
            return { id: doc.id, ...docData } as T;
        });
        callback(data);
    }, (error) => {
        console.error(`Error listening to ${collectionName}:`, error);
        callback([]);
    });
}


// ==================
// Real-time Listeners
// ==================

export function onDashboardStats(callback: (stats: DashboardStats | null) => void): Unsubscribe {
    if (!db) {
        callback(null);
        return () => {};
    }
    const statsRef = doc(db, 'dashboard', 'stats');
    return onSnapshot(statsRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback({
                ...data,
                lastUpdated: (data.lastUpdated as Timestamp).toDate(),
            } as DashboardStats);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error listening to dashboard stats:", error);
        callback(null);
    });
}

export function onSystemComponentStatuses(callback: (statuses: SystemComponentStatus[]) => void): Unsubscribe {
    return createListener<SystemComponentStatus>('systemStatus', callback);
}

export function onRecentActivities(callback: (activities: RecentActivity[]) => void, count: number = 10): Unsubscribe {
    return createListener<RecentActivity>('recentActivities', callback, 'timestamp', count);
}

export function onLogs(callback: (logs: SystemLog[]) => void): Unsubscribe {
    return createListener<SystemLog>('systemLogs', callback, 'timestamp');
}

export function onEmailLogs(callback: (logs: EmailLog[]) => void): Unsubscribe {
    return createListener<EmailLog>('emailLogs', callback, 'timestamp');
}

export function onScheduledTasks(callback: (tasks: ScheduledTask[]) => void): Unsubscribe {
    return createListener<ScheduledTask>('scheduledTasks', callback, 'scheduledTime');
}

export function onMachines(callback: (machines: Machine[]) => void): Unsubscribe {
    // Seeding default machines if the collection is empty
    if (!db) return () => {};
    const machineRef = collection(db, 'machines');
    getDocs(query(machineRef, limit(1))).then(snapshot => {
        if (snapshot.empty) {
            console.log("Seeding default machines...");
            addDoc(machineRef, { name: 'Machine-01', location: 'Factory A' });
            addDoc(machineRef, { name: 'Machine-02', location: 'Factory A' });
            addDoc(machineRef, { name: 'Packaging-Line-01', location: 'Factory B' });
        }
    });
    return createListener<Machine>('machines', callback, 'name');
}

export function onReportTemplates(callback: (templates: ReportTemplate[]) => void): Unsubscribe {
    return createListener<ReportTemplate>('reportTemplates', callback, 'lastModified');
}


// A one-time check for SCADA DB connectivity
export async function isScadaDbConnected(): Promise<boolean> {
    try {
        const settings = await getUserSettingsFlow();
        if (!settings?.database?.server || !settings?.database?.databaseName) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}
