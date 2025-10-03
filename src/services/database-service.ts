
import { db } from '@/lib/firebase/firebase';
import { DashboardStats, RecentActivity, ScadaDataPoint, SystemComponentStatus, Machine, ReportTemplate, ScheduledTask, SystemLog, UserSettings, EmailLog } from '@/lib/types/database';
import { collection, doc, getDoc, setDoc, getDocs, limit, orderBy, query, onSnapshot, Unsubscribe, Timestamp, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';


// --- Seeding Function for Default Templates ---
const defaultTemplates: Omit<ReportTemplate, 'id' | 'lastModified'>[] = [
    {
        name: 'Daily Production Summary',
        description: 'Tracks key production metrics like output, uptime, and efficiency over a 24-hour period.',
        category: 'Production',
        thumbnailUrl: 'https://picsum.photos/seed/tech_abstract_1/300/200',
    },
    {
        name: 'Weekly Downtime Analysis',
        description: 'Analyzes all machine downtime events over the past week to identify recurring issues.',
        category: 'Maintenance',
        thumbnailUrl: 'https://picsum.photos/seed/tech_chart_2/300/200',
    },
    {
        name: 'Monthly Quality Control Report',
        description: 'A comprehensive review of quality metrics, including defect rates and specification adherence for the month.',
        category: 'Quality',
        thumbnailUrl: 'https://picsum.photos/seed/data_visualization_3/300/200',
    },
    {
        name: 'Energy Consumption Overview',
        description: 'Monitors and reports on the energy usage of selected machines to optimize consumption.',
        category: 'Energy',
        thumbnailUrl: 'https://picsum.photos/seed/green_tech_4/300/200',
    },
    {
        name: 'Operator Shift Handover',
        description: 'A summary of key events, alarms, and production notes for a smooth shift transition.',
        category: 'Operations',
        thumbnailUrl: 'https://picsum.photos/seed/industrial_control_5/300/200',
    }
];

async function seedReportTemplates() {
    if (!db) return;
    const templatesRef = collection(db, 'reportTemplates');
    const snapshot = await getDocs(query(templatesRef, limit(1)));
    
    if (snapshot.empty) {
        console.log("No report templates found. Seeding default templates...");
        const batch = writeBatch(db);
        defaultTemplates.forEach(template => {
            const docRef = doc(templatesRef);
            batch.set(docRef, { ...template, lastModified: serverTimestamp() });
        });
        await batch.commit();
        console.log("Default templates seeded successfully.");
    }
}


function createListener<T>(collectionName: string, callback: (data: T[]) => void, orderField?: string): Unsubscribe {
    if (!db) {
        console.error("Firestore is not initialized. Cannot create listener.");
        callback([]);
        return () => {};
    }
    const collRef = collection(db, collectionName);
    const q = orderField ? query(collRef, orderBy(orderField, 'desc')) : query(collRef);
    
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
    if (!db) {
        callback([]);
        return () => {};
    }
    const activitiesRef = collection(db, 'recentActivities');
    const q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(count));
    
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: (doc.data().timestamp as Timestamp).toDate(),
        } as RecentActivity));
        callback(data);
    }, (error) => {
        console.error(`Error listening to recent activities:`, error);
        callback([]);
    });
}

export function onMachines(callback: (machines: Machine[]) => void): Unsubscribe {
    return createListener<Machine>('machines', callback, 'name');
}

export function onReportTemplates(callback: (templates: ReportTemplate[]) => void): Unsubscribe {
    // Seed templates on initial listener setup if collection is empty
    seedReportTemplates();
    return createListener<ReportTemplate>('reportTemplates', callback, 'lastModified');
}

export function onScheduledTasks(callback: (scheduledTasks: ScheduledTask[]) => void): Unsubscribe {
    return createListener<ScheduledTask>('scheduledTasks', callback, 'scheduledTime');
}

export function onLogs(callback: (logs: SystemLog[]) => void): Unsubscribe {
    return createListener<SystemLog>('systemLogs', callback, 'timestamp');
}

export function onEmailLogs(callback: (logs: EmailLog[]) => void): Unsubscribe {
    return createListener<EmailLog>('emailLogs', callback, 'timestamp');
}

// ===== Settings Service =====
export async function saveUserSettingsToDb(userId: string, settings: Omit<UserSettings, 'userId'>) {
    if (!db) throw new Error("Firestore is not initialized.");
    const settingsRef = doc(db, 'userSettings', userId);
    await setDoc(settingsRef, settings, { merge: true });
}

export async function getUserSettingsFromDb(userId: string): Promise<UserSettings | null> {
    if (!db) throw new Error("Firestore is not initialized.");
    const settingsRef = doc(db, 'userSettings', userId);
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        // Ensure nested objects exist to prevent client-side errors
        return { 
            userId,
            ...data,
            database: data.database || {},
            email: data.email || {},
            dataMapping: data.dataMapping || {},
            notifications: data.notifications || {},
        } as UserSettings;
    }
    return null;
}

// ===== Scheduler Service =====
export async function scheduleNewTaskInDb(task: Omit<ScheduledTask, 'id' | 'status'>) {
    if (!db) throw new Error("Firestore is not initialized.");
    await addDoc(collection(db, 'scheduledTasks'), {
        ...task,
        status: 'scheduled',
    });
}

// ===== Template Service =====
export async function createNewTemplateInDb(template: Omit<ReportTemplate, 'id' | 'lastModified'>) {
    if (!db) throw new Error("Firestore is not initialized.");
     await addDoc(collection(db, 'reportTemplates'), {
        ...template,
        lastModified: serverTimestamp(),
    });
}

// ===== Email Service =====
export async function addEmailLogToDb(log: Omit<EmailLog, 'id' | 'timestamp'>) {
    if (!db) throw new Error("Firestore is not initialized.");
    await addDoc(collection(db, 'emailLogs'), {
        ...log,
        timestamp: serverTimestamp(),
    });
}
