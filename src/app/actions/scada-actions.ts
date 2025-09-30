
'use server';

import type { ScadaDataPoint } from "@/lib/types/database";
import sql from 'mssql';
import nodemailer from 'nodemailer';
import { reportCriteriaSchema } from "@/components/report-generator/step1-criteria";
import { z } from "zod";
import { emailSettingsSchema } from "@/lib/types/database";

export type ScadaDbCredentials = {
    server?: string | null;
    database?: string | null;
    user?: string | null;
    password?: string | null;
}

type GetScadaDataInput = {
    criteria: z.infer<typeof reportCriteriaSchema>;
    dbCreds: ScadaDbCredentials;
}

export async function getScadaData({ criteria, dbCreds }: GetScadaDataInput): Promise<ScadaDataPoint[]> {
    console.log("Fetching SCADA data with criteria:", criteria);
    
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

        if (!dbConfig.server || !dbConfig.database) {
             throw new Error("SCADA Database Server or Database Name is not configured in user settings.");
        }

        await sql.connect(dbConfig);

        const { dateRange, machineIds, parameterIds } = criteria;
        const machineIdList = machineIds.map(id => `'${id.replace(/'/g, "''")}'`).join(','); 
        
        let parameterFilter = '';
        if (parameterIds && parameterIds.length > 0) {
            const parameterIdList = parameterIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
            parameterFilter = `AND TagName IN (${parameterIdList})`;
        }

        // IMPORTANT: You MUST replace 'YourTagLoggingTableName' and the column names
        // (TagName, TimeStamp, TagValue, etc.) with the actual names from your SCADA database schema.
        const queryString = `
            SELECT TagName, TimeStamp, TagValue, ServerName FROM YourTagLoggingTableName
            WHERE 
                TimeStamp BETWEEN '${dateRange.from.toISOString()}' AND '${dateRange.to.toISOString()}'
                AND ServerName IN (${machineIdList})
                ${parameterFilter}
            ORDER BY 
                TimeStamp DESC;
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

type GetScadaTagsInput = {
    machineIds: string[];
    dbCreds: ScadaDbCredentials;
}

export async function getScadaTags({ machineIds, dbCreds }: GetScadaTagsInput): Promise<string[]> {
    console.log("Fetching SCADA tags for machines:", machineIds);
    if (!machineIds || machineIds.length === 0) return [];
    
    try {
        const dbConfig = {
            user: dbCreds.user || '',
            password: dbCreds.password || '',
            server: dbCreds.server || '',
            database: dbCreds.database || '',
            options: { encrypt: true, trustServerCertificate: true }
        };

        if (!dbConfig.server || !dbConfig.database) {
             throw new Error("SCADA Database Server or Database Name is not configured.");
        }

        await sql.connect(dbConfig);

        const machineIdList = machineIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
        
        // IMPORTANT: You MUST replace 'YourTagLoggingTableName' and 'ServerName' / 'TagName'
        // with the actual names from your SCADA database schema.
        const queryString = `
            SELECT DISTINCT TagName FROM YourTagLoggingTableName
            WHERE ServerName IN (${machineIdList})
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

export async function testSmtpConnection({ emailCreds }: { emailCreds: z.infer<typeof emailSettingsSchema> }): Promise<{ success: boolean, error?: string }> {
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
