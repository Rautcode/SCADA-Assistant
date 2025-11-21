
import { initAdmin } from '@/lib/firebase/admin';
import { ReportTemplate, ScheduledTask, UserSettings, settingsSchema } from '@/lib/types/database';
import { collection, doc, getDoc, setDoc, getDocs, limit, orderBy, query, Timestamp, addDoc, serverTimestamp, writeBatch, where, updateDoc } from 'firebase/firestore';
import imageData from '@/app/lib/placeholder-images.json';
import { z } from 'zod';


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

async function seedDefaultData() {
    const db = await getDb();
    const templatesRef = collection(db, 'reportTemplates');
    const templatesSnapshot = await getDocs(query(templatesRef, limit(1)));
    
    if (templatesSnapshot.empty) {
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

// Call seeding function on startup
seedDefaultData();


// ===== Server-Side Only Functions =====
// These functions use the Admin SDK and should only be called from Server Actions or Genkit flows.

// ===== Settings Service (SERVER-SIDE) =====
export async function saveUserSettingsToDb(userId: string, settings: z.infer<typeof settingsSchema>) {
    const db = await getDb();
    const settingsRef = doc(db, 'userSettings', userId);
    // The client sends the entire settings object. We persist it directly.
    await setDoc(settingsRef, settings, { merge: true });
}

export async function getSystemSettingsFromDb(): Promise<z.infer<typeof settingsSchema> | null> {
    const db = await getDb();
    const settingsRef = doc(db, 'userSettings', 'system');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        // Correctly return the nested settings object.
        return docSnap.data() as z.infer<typeof settingsSchema>;
    }
    return null;
}

export async function getUserSettingsFromDb(userId: string): Promise<z.infer<typeof settingsSchema> | null> {
    if (userId === 'system') return getSystemSettingsFromDb();

    const db = await getDb();
    const settingsRef = doc(db, 'userSettings', userId);
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        // Correctly return the nested settings object.
        return docSnap.data() as z.infer<typeof settingsSchema>;
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

    