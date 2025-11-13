
'use client';

import { collection, query, onSnapshot, orderBy, limit, doc, Timestamp, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase'; // Direct import of client-side db
import { DashboardStats, EmailLog, Machine, RecentActivity, ReportTemplate, ScheduledTask, SystemComponentStatus, SystemLog } from '@/lib/types/database';

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

// These are now the centralized listeners for shared data.
export function onMachines(callback: (machines: Machine[]) => void): Unsubscribe {
    return createListener<Machine>('machines', callback, 'name');
}

export function onReportTemplates(callback: (templates: ReportTemplate[]) => void): Unsubscribe {
    return createListener<ReportTemplate>('reportTemplates', callback, 'lastModified');
}
