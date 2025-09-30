
import { db } from '@/lib/firebase/firebase';
import { DashboardStats, RecentActivity, ScadaDataPoint, SystemComponentStatus, Machine, ReportTemplate, ScheduledTask, SystemLog, UserSettings, EmailLog } from '@/lib/types/database';
import { collection, doc, getDoc, setDoc, getDocs, limit, orderBy, query, onSnapshot, Unsubscribe, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';


function createListener<T>(collectionName: string, callback: (data: T[]) => void, orderField?: string): Unsubscribe {
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
    const settingsRef = doc(db, 'userSettings', userId);
    await setDoc(settingsRef, settings, { merge: true });
}

export async function getUserSettingsFromDb(userId: string): Promise<UserSettings | null> {
    const settingsRef = doc(db, 'userSettings', userId);
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        // Ensure nested objects exist
        if (!data.database) data.database = {};
        if (!data.email) data.email = {};
        if (!data.dataMapping) data.dataMapping = {};
        return { userId, ...data } as UserSettings;
    }
    return null;
}

// ===== Scheduler Service =====
export async function scheduleNewTaskInDb(task: Omit<ScheduledTask, 'id' | 'status'>) {
    await addDoc(collection(db, 'scheduledTasks'), {
        ...task,
        status: 'scheduled',
    });
}

// ===== Template Service =====
export async function createNewTemplateInDb(template: Omit<ReportTemplate, 'id' | 'lastModified'>) {
     await addDoc(collection(db, 'reportTemplates'), {
        ...template,
        lastModified: serverTimestamp(),
    });
}

// ===== Email Service =====
export async function addEmailLogToDb(log: Omit<EmailLog, 'id' | 'timestamp'>) {
    await addDoc(collection(db, 'emailLogs'), {
        ...log,
        timestamp: serverTimestamp(),
    });
}
