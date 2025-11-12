
import { initAdmin } from '@/lib/firebase/admin';
import { ReportTemplate, ScheduledTask, UserSettings } from '@/lib/types/database';
import { collection, doc, getDoc, setDoc, getDocs, limit, orderBy, query, Timestamp, addDoc, serverTimestamp, writeBatch, where, updateDoc } from 'firebase/firestore';
import imageData from '@/app/lib/placeholder-images.json';


// --- Seeding Function for Default Templates ---
const defaultTemplates: Omit<ReportTemplate, 'id' | 'lastModified'>[] = [
    {
        name: 'Daily Production Summary',
        description: 'Tracks key production metrics like output, uptime, and efficiency over a 24-hour period.',
        category: 'Production',
        thumbnailUrl: imageData.templates.default.production.src,
    },
    {
        name: 'Weekly Downtime Analysis',
        description: 'Analyzes all machine downtime events over the past week to identify recurring issues.',
        category: 'Maintenance',
        thumbnailUrl: imageData.templates.default.downtime.src,
    },
    {
        name: 'Monthly Quality Control Report',
        description: 'A comprehensive review of quality metrics, including defect rates and specification adherence for the month.',
        category: 'Quality',
        thumbnailUrl: imageData.templates.default.quality.src,
    },
    {
        name: 'Energy Consumption Overview',
        description: 'Monitors and reports on the energy usage of selected machines to optimize consumption.',
        category: 'Energy',
        thumbnailUrl: imageData.templates.default.energy.src,
    },
    {
        name: 'Operator Shift Handover',
        description: 'A summary of key events, alarms, and production notes for a smooth shift transition.',
        category: 'Operations',
        thumbnailUrl: imageData.templates.default.operations.src,
    }
];

async function getDb() {
    const app = await initAdmin();
    return app.firestore();
}

async function seedReportTemplates() {
    const db = await getDb();
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


// ===== Server-Side Only Functions =====
// These functions use the Admin SDK and should only be called from Server Actions or Genkit flows.

export async function getReportTemplatesFromDb(): Promise<ReportTemplate[]> {
    await seedReportTemplates(); // Ensure templates exist
    const db = await getDb();
    const templatesRef = collection(db, 'reportTemplates');
    const q = query(templatesRef, orderBy('lastModified', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            lastModified: (data.lastModified as Timestamp).toDate(),
        } as ReportTemplate;
    });
}

export async function getScheduledTasksFromDb(): Promise<ScheduledTask[]> {
    const db = await getDb();
    const tasksRef = collection(db, 'scheduledTasks');
    const q = query(tasksRef, orderBy('scheduledTime', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            scheduledTime: (data.scheduledTime as Timestamp).toDate(),
        } as ScheduledTask;
    });
}

export async function getMachinesFromDb(): Promise<any[]> {
    const db = await getDb();
    const machinesRef = collection(db, 'machines');
    const q = query(machinesRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ===== Settings Service (SERVER-SIDE) =====
export async function saveUserSettingsToDb(userId: string, settings: Omit<UserSettings, 'userId'>) {
    const db = await getDb();
    const settingsRef = doc(db, 'userSettings', userId);
    await setDoc(settingsRef, settings, { merge: true });
}

export async function getSystemSettingsFromDb(): Promise<UserSettings | null> {
    // This is a dedicated function to get system-wide settings, e.g., for system emails.
    // It fetches from a specific document ID 'system'.
    const db = await getDb();
    const settingsRef = doc(db, 'userSettings', 'system');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            userId: 'system',
            ...data,
            email: data.email || {},
            notifications: data.notifications || {},
            database: data.database || {},
            dataMapping: data.dataMapping || {},
        } as UserSettings;
    }
    return null;
}

export async function getUserSettingsFromDb(userId: string): Promise<UserSettings | null> {
    if (userId === 'system') return getSystemSettingsFromDb();

    const db = await getDb();
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

// ===== Scheduler Service (SERVER-SIDE) =====
export async function scheduleNewTaskInDb(task: Omit<ScheduledTask, 'id' | 'status'>) {
    const db = await getDb();
    await addDoc(collection(db, 'scheduledTasks'), {
        ...task,
        status: 'scheduled',
    });
}

export async function getDueTasks(): Promise<ScheduledTask[]> {
    const db = await getDb();
    const now = new Date();
    const tasksRef = collection(db, 'scheduledTasks');
    const q = query(
        tasksRef,
        where('status', '==', 'scheduled'),
        where('scheduledTime', '<=', now)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id,
             ...data,
             scheduledTime: (data.scheduledTime as Timestamp).toDate(),
            } as ScheduledTask
    });
}

export async function updateTaskStatus(taskId: string, status: ScheduledTask['status'], error?: string) {
    const db = await getDb();
    const taskRef = doc(db, 'scheduledTasks', taskId);
    const updateData: { status: ScheduledTask['status']; error?: string } = { status };
    if (error) {
        updateData.error = error;
    } else {
        // Firestore requires us to explicitly delete the field if we want to remove it
        updateData.error = ''; 
    }
    await updateDoc(taskRef, updateData);
}

// ===== Template Service (SERVER-SIDE) =====
export async function createNewTemplateInDb(template: Omit<ReportTemplate, 'id' | 'lastModified'>) {
    const db = await getDb();
     await addDoc(collection(db, 'reportTemplates'), {
        ...template,
        lastModified: serverTimestamp(),
    });
}

export async function getTemplateById(templateId: string): Promise<ReportTemplate | null> {
    const db = await getDb();
    const templateRef = doc(db, 'reportTemplates', templateId);
    const docSnap = await getDoc(templateRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return { 
            id: docSnap.id,
            ...data,
            lastModified: (data.lastModified as Timestamp).toDate(),
        } as ReportTemplate;
    }
    return null;
}

// ===== Email Service (SERVER-SIDE) =====
export async function addEmailLogToDb(log: Omit<any, 'id' | 'timestamp'>) {
    const db = await getDb();
    await addDoc(collection(db, 'emailLogs'), {
        ...log,
        timestamp: serverTimestamp(),
    });
}
