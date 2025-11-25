
import { getAdminApp } from '@/lib/firebase/admin';
import { ReportTemplate, ScheduledTask, UserSettings, settingsSchema } from '@/lib/types/database';
import { collection, doc, getDoc, setDoc, getDocs, limit, orderBy, query, Timestamp, addDoc, serverTimestamp, writeBatch, where, updateDoc } from 'firebase/firestore';
import { z } from 'zod';

async function getDb() {
    const app = getAdminApp();
    return app.firestore();
}

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
