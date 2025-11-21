
'use server';

import { z } from "zod";
import { settingsSchema } from "@/lib/types/database";
import { getUserSettingsFromDb, saveUserSettingsToDb } from "@/services/database-service";
import sql from 'mssql';
import nodemailer from 'nodemailer';
import { getAuthenticatedUser } from "@genkit-ai/next/auth";

async function getVerifiedUid(): Promise<string> {
    const auth = await getAuthenticatedUser();
    if (!auth) {
        throw new Error("User is not authenticated.");
    }
    return auth.uid;
}

export async function getUserSettings() {
  const userId = await getVerifiedUid();
  const settings = await getUserSettingsFromDb(userId);
  return settings;
}

export async function saveUserSettings({ settings }: { settings: z.infer<typeof settingsSchema> }): Promise<{ success: boolean; error?: string }> {
  const userId = await getVerifiedUid();

  try {
    await saveUserSettingsToDb(userId, settings);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to save user settings:", error);
    return { success: false, error: "An unexpected error occurred while saving settings." };
  }
}

export async function getDbSchema(): Promise<{ tables: string[], columns: { [key: string]: string[] } }> {
    const userId = await getVerifiedUid();

    console.log(`Fetching DB schema for user ${userId}...`);

    const userSettings = await getUserSettingsFromDb(userId);
    const dbCreds = userSettings?.database;
    
    if (!dbCreds?.server || !dbCreds?.databaseName) {
         throw new Error("SCADA Database Server or Database Name is not configured in user settings.");
    }
    
    const dbConfig: sql.config = {
        user: dbCreds.user || undefined,
        password: dbCreds.password || undefined,
        server: dbCreds.server,
        database: dbCreds.databaseName,
        options: { 
            encrypt: false, 
            trustServerCertificate: true,
            connectionTimeout: 10000 
        }
    };
    
    let pool: sql.ConnectionPool | undefined;
    try {
        pool = await sql.connect(dbConfig);

        const tablesResult = await pool.request().query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`);
        const tables: string[] = tablesResult.recordset.map(row => row.TABLE_NAME);

        const columns: { [key: string]: string[] } = {};
        for (const table of tables) {
            const columnsResult = await pool.request().input('tableName', sql.NVarChar, table).query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tableName ORDER BY ORDINAL_POSITION`);
            columns[table] = columnsResult.recordset.map(row => row.COLUMN_NAME);
        }
        
        console.log(`Found ${tables.length} tables.`);
        return { tables, columns };

    } catch (error: any) {
        console.error("Failed to fetch DB schema from SQL Server:", error.message);
        throw new Error(`Database schema query failed. Please check connection details.`);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

export async function testScadaConnection(): Promise<{ success: boolean, error?: string }> {
    const userId = await getVerifiedUid();
    const userSettings = await getUserSettingsFromDb(userId);
    const dbCreds = userSettings?.database;

    if (!dbCreds?.server || !dbCreds?.databaseName) {
        return { success: false, error: "Database Server or Name is not configured." };
    }

    try {
        await sql.connect({
            user: dbCreds.user || undefined,
            password: dbCreds.password || undefined,
            server: dbCreds.server,
            database: dbCreds.databaseName,
            options: {
                encrypt: false,
                trustServerCertificate: true
            },
            connectionTimeout: 5000 // 5 second timeout
        });
        await sql.close();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function testSmtpConnection(): Promise<{ success: boolean; error?: string; }> {
    const userId = await getVerifiedUid();

    const userSettings = await getUserSettingsFromDb(userId);
    const smtpSettings = userSettings?.email;

    if (!smtpSettings?.smtpHost || !smtpSettings?.smtpPort || !smtpSettings.smtpUser) {
      return { success: false, error: "SMTP settings are not fully configured." };
    }

    const transporter = nodemailer.createTransport({
      host: smtpSettings.smtpHost,
      port: smtpSettings.smtpPort,
      secure: smtpSettings.smtpPort === 465,
      auth: {
        user: smtpSettings.smtpUser,
        pass: smtpSettings.smtpPass,
      },
       tls: {
          rejectUnauthorized: false
      }
    });

    try {
      await transporter.verify();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
}
