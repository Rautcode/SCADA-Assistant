
'use server';

import type { ScadaDataPoint } from "@/lib/types/database";
import sql from 'mssql';
import nodemailer from 'nodemailer';
import { reportCriteriaSchema } from "@/components/report-generator/step1-criteria";
import { z } from "zod";
import { dataMappingSchema, emailSettingsSchema, settingsSchema } from "@/lib/types/database";
import { getUserSettingsFromDb, saveUserSettingsToDb } from "@/services/database-service";


// Types for credentials to be passed around
export type ScadaDbCredentials = {
    server?: string | null;
    database?: string | null;
    user?: string | null;
    password?: string | null;
}
export type SmtpCredentials = z.infer<typeof emailSettingsSchema>;
export type ScadaDataMapping = z.infer<typeof dataMappingSchema>;

// Server Action to get SCADA data
type GetScadaDataInput = {
    criteria: z.infer<typeof reportCriteriaSchema>;
    dbCreds: ScadaDbCredentials;
    mapping: ScadaDataMapping;
}
export async function getScadaData({ criteria, dbCreds, mapping }: GetScadaDataInput): Promise<ScadaDataPoint[]> {
    console.log("Fetching SCADA data with criteria:", criteria);
    
    if (!dbCreds.server || !dbCreds.database) {
         throw new Error("SCADA Database Server or Database Name is not configured in user settings.");
    }
    if (!mapping.table || !mapping.timestampColumn || !mapping.machineColumn || !mapping.parameterColumn || !mapping.valueColumn) {
        throw new Error("Database table and column mappings are not fully configured in Settings > Data Mapping.");
    }

    try {
        const dbConfig = {
            user: dbCreds.user || '',
            password: dbCreds.password || '',
            server: dbCreds.server || '',
            database: dbCreds.database || '',
            options: {
                encrypt: true, 
                trustServerCertificate: true 
            }
        };

        await sql.connect(dbConfig);

        const { dateRange, machineIds, parameterIds } = criteria;
        const machineIdList = machineIds.map(id => `'${id.replace(/'/g, "''")}'`).join(','); 
        
        let parameterFilter = '';
        if (parameterIds && parameterIds.length > 0) {
            const parameterIdList = parameterIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
            parameterFilter = `AND ${mapping.parameterColumn} IN (${parameterIdList})`;
        }
        
        const queryString = `
            SELECT 
                ${mapping.parameterColumn} as TagName, 
                ${mapping.timestampColumn} as TimeStamp, 
                ${mapping.valueColumn} as TagValue, 
                ${mapping.machineColumn} as ServerName 
            FROM ${mapping.table}
            WHERE 
                ${mapping.timestampColumn} BETWEEN '${dateRange.from.toISOString()}' AND '${dateRange.to.toISOString()}'
                AND ${mapping.machineColumn} IN (${machineIdList})
                ${parameterFilter}
            ORDER BY 
                ${mapping.timestampColumn} DESC;
        `;
        const result = await sql.query(queryString);
        
        const formattedData: ScadaDataPoint[] = result.recordset.map((row: any) => ({
            id: `${row.TagName}-${row.TimeStamp.toISOString()}`,
            timestamp: new Date(row.TimeStamp),
            machine: row.ServerName, 
            parameter: row.TagName,
            value: row.TagValue,
            unit: "N/A", 
        }));
        
        await sql.close();
        
        console.log(`Returning ${formattedData.length} data points from live SCADA SQL database.`);
        return formattedData;

    } catch (error: any) {
        console.error("Failed to fetch SCADA data from SQL Server:", error.message);
        // Ensure connection is closed on error, if it was opened
        if (sql.connected) {
            await sql.close();
        }
        throw new Error(`Database connection failed: ${error.message}. Please check your connection details in Settings.`);
    }
}


// Server Action to get SCADA tags
type GetScadaTagsInput = {
    machineIds: string[];
    dbCreds: ScadaDbCredentials;
    mapping: ScadaDataMapping;
}
export async function getScadaTags({ machineIds, dbCreds, mapping }: GetScadaTagsInput): Promise<string[]> {
    console.log("Fetching SCADA tags for machines:", machineIds);
    if (!machineIds || machineIds.length === 0) return [];
    
    if (!dbCreds.server || !dbCreds.database) {
         throw new Error("SCADA Database Server or Database Name is not configured.");
    }
     if (!mapping.table || !mapping.machineColumn || !mapping.parameterColumn) {
        throw new Error("Database table and column mappings are not fully configured in Settings > Data Mapping.");
    }
    
    try {
        const dbConfig = {
            user: dbCreds.user || '',
            password: dbCreds.password || '',
            server: dbCreds.server || '',
            database: dbCreds.database || '',
            options: { encrypt: true, trustServerCertificate: true }
        };

        await sql.connect(dbConfig);

        const machineIdList = machineIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
        
        const queryString = `
            SELECT DISTINCT ${mapping.parameterColumn} as TagName FROM ${mapping.table}
            WHERE ${mapping.machineColumn} IN (${machineIdList})
            ORDER BY TagName ASC;
        `;
        const result = await sql.query(queryString);
        
        const tags: string[] = result.recordset.map((row: any) => row.TagName);
        
        await sql.close();
        
        console.log(`Returning ${tags.length} unique tags.`);
        return tags;

    } catch (error: any) {
        console.error("Failed to fetch SCADA tags from SQL Server:", error.message);
        if (sql.connected) {
            await sql.close();
        }
        throw new Error(`Database query for tags failed: ${error.message}. Please check your connection details in Settings.`);
    }
}

// Server Action to get DB schema
type GetDbSchemaInput = {
    dbCreds: ScadaDbCredentials;
};

export async function getDbSchema({ dbCreds }: GetDbSchemaInput): Promise<{ tables: string[], columns: { [key: string]: string[] } }> {
    console.log("Fetching DB schema...");
    
    if (!dbCreds.server || !dbCreds.database) {
         throw new Error("SCADA Database Server or Database Name is not configured in user settings.");
    }

    try {
        const dbConfig = {
            user: dbCreds.user || '',
            password: dbCreds.password || '',
            server: dbCreds.server || '',
            database: dbCreds.database || '',
            options: { encrypt: true, trustServerCertificate: true, connectionTimeout: 10000 }
        };

        await sql.connect(dbConfig);

        const tablesResult = await sql.query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`);
        const tables: string[] = tablesResult.recordset.map(row => row.TABLE_NAME);

        const columns: { [key: string]: string[] } = {};
        for (const table of tables) {
            const columnsResult = await sql.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table.replace(/'/g, "''")}' ORDER BY ORDINAL_POSITION`);
            columns[table] = columnsResult.recordset.map(row => row.COLUMN_NAME);
        }
        
        await sql.close();
        console.log(`Found ${tables.length} tables.`);
        return { tables, columns };

    } catch (error: any) {
        console.error("Failed to fetch DB schema from SQL Server:", error.message);
        if (sql.connected) {
            await sql.close();
        }
        throw new Error(`Database schema query failed: ${error.message}.`);
    }
}


// Server Action to test SCADA connection
export async function testScadaConnection({ dbCreds }: { dbCreds: ScadaDbCredentials }): Promise<{ success: boolean, error?: string }> {
    console.log("Testing SCADA DB connection...");
    try {
        const dbConfig = {
            user: dbCreds.user || '',
            password: dbCreds.password || '',
            server: dbCreds.server || '',
            database: dbCreds.database || '',
            options: {
                encrypt: true, 
                trustServerCertificate: true,
                connectionTimeout: 5000 // 5 second timeout
            }
        };

        if (!dbConfig.server || !dbConfig.database) {
            throw new Error("Server and Database Name are required.");
        }

        await sql.connect(dbConfig);
        await sql.close();
        
        console.log("SCADA DB connection test successful.");
        return { success: true };

    } catch (error: any) {
        console.error("SCADA DB connection test failed:", error.message);
        if (sql.connected) {
            await sql.close();
        }
        return { success: false, error: error.message };
    }
}


// Server Action to test SMTP connection
export async function testSmtpConnection({ emailCreds }: { emailCreds: SmtpCredentials }): Promise<{ success: boolean, error?: string }> {
    console.log("Testing SMTP connection...");
    if (!emailCreds?.smtpHost || !emailCreds?.smtpPort) {
        return { success: false, error: "SMTP Host and Port are required." };
    }

    try {
        const transporter = nodemailer.createTransport({
            host: emailCreds.smtpHost,
            port: emailCreds.smtpPort,
            secure: emailCreds.smtpPort === 465,
            auth: {
                user: emailCreds.smtpUser,
                pass: emailCreds.smtpPass,
            },
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 10000 // 10 second timeout
        });

        await transporter.verify();
        
        console.log("SMTP connection test successful.");
        return { success: true };

    } catch (error: any) {
        console.error("SMTP connection test failed:", error.message);
        return { success: false, error: error.message };
    }
}


// Server Actions for User Settings
export async function saveUserSettings(input: { userId: string, settings: z.infer<typeof settingsSchema> }) {
  await saveUserSettingsToDb(input.userId, input.settings);
}

export async function getUserSettings(input: { userId: string }) {
  try {
    return await getUserSettingsFromDb(input.userId);
  } catch (error) {
    console.error('Failed to get user settings from DB:', error);
    // Return null or re-throw, but don't let it be an unhandled rejection.
    // For the purpose of the client-side call, returning null is safer.
    return null;
  }
}
