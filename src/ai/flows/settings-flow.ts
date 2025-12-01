
'use server';
/**
 * @fileOverview Authenticated Genkit flows for managing user and system settings.
 */

import { z } from 'zod';
import { ai } from '../genkit';
import { UserSettings, type SettingsFormValues, DatabaseProfile } from '@/lib/types/database';
import { UserSettingsFlowInput } from '@/lib/types/flows';
import { getUserSettingsFromDb, saveUserSettingsToDb } from '@/services/database-service';
import sql from 'mssql';
import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';

// Helper function to get a user's verified settings securely from a flow
async function getVerifiedUserSettings(uid: string) {
    const userSettings = await getUserSettingsFromDb(uid);
    if (!userSettings) {
        throw new Error("User settings not found.");
    }
    const activeProfile = userSettings.databaseProfiles?.find(p => p.id === userSettings.activeProfileId);
    if (!activeProfile) {
        throw new Error("No active database profile found.");
    }
    return { userSettings, activeProfile };
}

function isConnectionString(server: string): boolean {
    return /.+?=.+?;/i.test(server);
}

// Function to construct the final connection string, injecting credentials if necessary.
function buildConnectionString(server: string, user?: string, password?: string): string {
    let connString = server;
    if (user && !/user id=|uid=/i.test(connString)) {
        connString += `;User ID=${user}`;
    }
    if (password && !/password=|pwd=/i.test(connString)) {
        connString += `;Password=${password}`;
    }
    return connString;
}


// Flow to get current user's settings. Includes logic to migrate old settings format.
export const getUserSettingsFlow = ai.defineFlow(
  {
    name: 'getUserSettingsFlow',
    inputSchema: z.void(),
    outputSchema: z.custom<UserSettings | null>(),
  },
  async (_, { auth }) => {
    if (!auth) return null;

    let settings = await getUserSettingsFromDb(auth.uid);

    // One-time migration for users with old settings structure
    if (settings && settings.database && !settings.databaseProfiles) {
      console.log(`Migrating old database settings for user ${auth.uid}`);
      const newProfile: DatabaseProfile = {
        id: randomUUID(),
        name: 'Default Profile',
        server: settings.database.server,
        databaseName: settings.database.databaseName,
        user: settings.database.user,
        password: settings.database.password,
        mapping: settings.dataMapping,
      };

      const migratedSettings: UserSettings = {
        ...settings,
        databaseProfiles: [newProfile],
        activeProfileId: newProfile.id,
        database: undefined, // Clear old fields
        dataMapping: undefined, // Clear old fields
      };
      
      await saveUserSettingsToDb(auth.uid, migratedSettings);
      return migratedSettings;
    }

    return settings;
  }
);


// Flow to save user settings
export const saveUserSettingsFlow = ai.defineFlow(
  {
    name: 'saveUserSettingsFlow',
    inputSchema: UserSettingsFlowInput,
    outputSchema: z.object({ success: z.boolean(), error: z.string().optional() }),
  },
  async (settings: Partial<SettingsFormValues>, { auth }) => {
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

    const { activeProfile } = await getVerifiedUserSettings(auth.uid);
    if (!activeProfile.server) {
      return { success: false, error: "Server address is missing in the active profile." };
    }
    if (!isConnectionString(activeProfile.server) && !activeProfile.databaseName) {
        return { success: false, error: "Database name is missing in the active profile." };
    }

    let pool;
    try {
      const connectionConfig = isConnectionString(activeProfile.server)
        ? { 
            connectionString: buildConnectionString(activeProfile.server, activeProfile.user, activeProfile.password), 
            options: { trustServerCertificate: true } 
          }
        : {
            user: activeProfile.user || undefined,
            password: activeProfile.password || undefined,
            server: activeProfile.server,
            database: activeProfile.databaseName!,
            options: { encrypt: false, trustServerCertificate: true },
            connectionTimeout: 5000,
            requestTimeout: 5000,
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000,
                acquireTimeoutMillis: 30000,
            },
          };

      pool = await sql.connect(connectionConfig);
      return { success: true };
    } catch (error: any) {
        console.error("SQL Connection Error:", error);
        let detailedError = "An unknown error occurred.";
        if (error.code === 'ELOGIN') {
            detailedError = "Login failed. Please check the username and password.";
        } else if (error.code === 'ETIMEOUT') {
            detailedError = `Connection timed out. The server at '${activeProfile.server}' could not be reached.`;
        } else if (error.code === 'ENOCONN') {
             detailedError = `Could not connect to the server at '${activeProfile.server}'.`;
        } else if (error.message) {
            detailedError = error.message;
        }
        return { success: false, error: `Connection failed: ${detailedError}` };
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

    const { userSettings } = await getVerifiedUserSettings(auth.uid);
    const smtpConfig = userSettings.email;
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

// Flow to get database schema for the active profile
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

    const { activeProfile } = await getVerifiedUserSettings(auth.uid);
    if (!activeProfile.server) {
        throw new Error("Server address is missing in the active profile.");
    }
     if (!isConnectionString(activeProfile.server) && !activeProfile.databaseName) {
        throw new Error("Database name is missing in the active profile.");
    }

    let pool;
    try {
      const connectionConfig = isConnectionString(activeProfile.server)
        ? { 
            connectionString: buildConnectionString(activeProfile.server, activeProfile.user, activeProfile.password), 
            options: { trustServerCertificate: true } 
          }
        : {
            user: activeProfile.user || undefined,
            password: activeProfile.password || undefined,
            server: activeProfile.server,
            database: activeProfile.databaseName!,
            options: { encrypt: false, trustServerCertificate: true },
            connectionTimeout: 15000,
            requestTimeout: 15000,
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000,
                acquireTimeoutMillis: 30000,
            },
          };
          
      pool = await sql.connect(connectionConfig);
      
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
