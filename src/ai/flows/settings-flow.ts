
'use server';
/**
 * @fileOverview Authenticated Genkit flows for managing user and system settings.
 */

import { z } from 'zod';
import { ai } from '../genkit';
import { UserSettings, type SettingsFormValues } from '@/lib/types/database';
import { UserSettingsFlowInput } from '@/lib/types/flows';
import { getUserSettingsFromDb, saveUserSettingsToDb } from '@/services/database-service';
import sql from 'mssql';
import nodemailer from 'nodemailer';

// Helper function to get a user's verified settings securely from a flow
async function getVerifiedUserSettings(uid: string) {
    const userSettings = await getUserSettingsFromDb(uid);
    if (!userSettings) {
        throw new Error("User settings not found.");
    }
    return userSettings;
}

// Flow to get current user's settings
export const getUserSettingsFlow = ai.defineFlow(
  {
    name: 'getUserSettingsFlow',
    inputSchema: z.void(),
    outputSchema: z.custom<UserSettings | null>(),
  },
  async (_, { auth }) => {
    if (!auth) return null;
    return await getUserSettingsFromDb(auth.uid);
  }
);

// Flow to save user settings
export const saveUserSettingsFlow = ai.defineFlow(
  {
    name: 'saveUserSettingsFlow',
    inputSchema: UserSettingsFlowInput,
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  async (settings: SettingsFormValues, { auth }) => {
    if (!auth) return { success: false, error: "Authentication failed." };
    try {
      await saveUserSettingsToDb(auth.uid, settings);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
);

// Flow to test SCADA database connection
export const testScadaConnectionFlow = ai.defineFlow(
  {
    name: 'testScadaConnectionFlow',
    inputSchema: z.void(),
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  async (_, { auth }) => {
    if (!auth) throw new Error("Authentication failed.");

    const settings = await getVerifiedUserSettings(auth.uid);
    const dbConfig = settings.database;
    if (!dbConfig?.server || !dbConfig.databaseName) {
      return { success: false, error: "Server address or database name is missing." };
    }

    let pool;
    try {
      pool = await sql.connect({
        user: dbConfig.user || undefined,
        password: dbConfig.password || undefined,
        server: dbConfig.server,
        database: dbConfig.databaseName,
        options: { encrypt: false, trustServerCertificate: true },
        connectionTimeout: 5000,
        requestTimeout: 5000,
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: `Connection failed: ${error.message}` };
    } finally {
      pool?.close();
    }
  }
);

// Flow to test SMTP connection
export const testSmtpConnectionFlow = ai.defineFlow(
  {
    name: 'testSmtpConnectionFlow',
    inputSchema: z.void(),
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  async (_, { auth }) => {
    if (!auth) throw new Error("Authentication failed.");

    const settings = await getVerifiedUserSettings(auth.uid);
    const smtpConfig = settings.email;
    if (!smtpConfig?.smtpHost || !smtpConfig.smtpPort || !smtpConfig.smtpUser) {
      return { success: false, error: "SMTP host, port, or user is missing." };
    }
    
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.smtpPort === 465,
      auth: {
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass,
      },
      tls: { rejectUnauthorized: false }
    });

    try {
      await transporter.verify();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: `Verification failed: ${error.message}` };
    }
  }
);

// Flow to get database schema
export const getDbSchemaFlow = ai.defineFlow(
  {
    name: 'getDbSchemaFlow',
    inputSchema: z.void(),
    outputSchema: z.object({
        tables: z.array(z.string()),
        columns: z.record(z.array(z.string())),
    }),
  },
  async (_, { auth }) => {
    if (!auth) throw new Error("Authentication failed.");

    const settings = await getVerifiedUserSettings(auth.uid);
    const dbConfig = settings.database;

    let pool;
    try {
      pool = await sql.connect({
        user: dbConfig.user || undefined,
        password: dbConfig.password || undefined,
        server: dbConfig.server,
        database: dbConfig.databaseName,
        options: { encrypt: false, trustServerCertificate: true }
      });
      
      const tablesResult = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
      const tables = tablesResult.recordset.map(row => row.TABLE_NAME);

      const columns: { [key: string]: string[] } = {};
      for (const table of tables) {
        const columnsResult = await pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}'`);
        columns[table] = columnsResult.recordset.map(row => row.COLUMN_NAME);
      }
      
      return { tables, columns };
    } catch (error: any) {
        throw new Error(`Failed to fetch schema: ${error.message}`);
    } finally {
        pool?.close();
    }
  }
);
