
import { z } from "zod";

export const emailSettingsSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
});

export const dataMappingSchema = z.object({
    table: z.string().optional(),
    timestampColumn: z.string().optional(),
    machineColumn: z.string().optional(),
    parameterColumn: z.string().optional(),
    valueColumn: z.string().optional(),
});

export const settingsSchema = z.object({
  // Appearance
  theme: z.enum(["light", "dark", "system"]),
  language: z.string().default("en"),

  // Notifications
  notifications: z.object({
    inApp: z.boolean().default(true),
    email: z.boolean().default(false),
    systemAlerts: z.boolean().default(true),
    reportCompletion: z.boolean().default(true),
  }),
  
  // Data & Integration
  syncFrequency: z.string().default("5"),
  apiKey: z.string().optional(),

  // Database Credentials
  database: z.object({
    server: z.string().optional(),
    databaseName: z.string().optional(),
    user: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
  
  // Data Mapping
  dataMapping: dataMappingSchema.optional(),

  // Email Settings
  email: emailSettingsSchema.optional(),
});
export type SettingsFormValues = z.infer<typeof settingsSchema>;


export interface DashboardStats {
    reports: number;
    tasks: number;
    users: number;
    systemStatus: 'Operational' | 'Degraded' | 'Offline';
    lastUpdated: Date;
  }
  
export interface SystemComponentStatus {
    name: string;
    status: 'Connected' | 'Active' | 'Degraded' | 'Idle' | 'Error';
}
  
export interface RecentActivity {
    id: string;
    title: string;
    description: string;
    timestamp: Date;
    icon: string; // Corresponds to a lucide-react icon name
    iconColor?: string;
}
  
export interface ScadaDataPoint {
    id: string;
    timestamp: Date;
    machine: string;
    parameter: string;
    value: number | string;
    unit: string;
    included?: boolean;
}
  
export interface Machine {
    id: string;
    name: string;
    location: string;
}

export interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    thumbnailUrl: string;
    lastModified: Date;
}

export interface ScheduledTask {
    id: string;
    name: string;
    templateId: string;
    scheduledTime: Date;
    status: 'scheduled' | 'completed' | 'failed' | 'overdue';
}

export interface SystemLog {
    id: string;
    timestamp: Date;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    source: string; // e.g., 'ReportEngine', 'Auth', 'Database'
}

export interface EmailLog {
    id: string;
    timestamp: Date;
    status: 'sent' | 'failed';
    to: string;
    subject: string;
    error?: string;
}

export interface UserSettings extends SettingsFormValues {
    userId: string;
}
