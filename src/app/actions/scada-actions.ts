
'use server';

import type { ScadaDataPoint } from "@/lib/types/database";
import sql from 'mssql';
import nodemailer from 'nodemailer';
import { reportCriteriaSchema } from "@/components/report-generator/step1-criteria";
import { z } from "zod";
import { dataMappingSchema, emailSettingsSchema } from "@/lib/types/database";


// Types for credentials to be passed around
export type ScadaDbCredentials = {
    server?: string | null;
    databaseName?: string | null;
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
    
    if (!dbCreds.server || !dbCreds.databaseName) {
         throw new Error("SCADA Database Server or Database Name is not configured in user settings.");
    }
    if (!mapping.table || !mapping.timestampColumn || !mapping.machineColumn || !mapping.parameterColumn || !mapping.valueColumn) {
        throw new Error("Database table and column mappings are not fully configured in Settings > Data Mapping.");
    }

    try {
        const dbConfig: sql.config = {
            user: dbCreds.user || undefined,
            password: dbCreds.password || undefined,
            server: dbCreds.server,
            database: dbCreds.databaseName,
            options: {
                encrypt: true, 
                trustServerCertificate: true 
            }
        };

        const pool = await sql.connect(dbConfig);
        const request = pool.request();

        const { dateRange, machineIds, parameterIds } = criteria;
        
        // Sanitize column names to prevent SQL injection from mapping settings
        const safeCols = {
            table: `[${mapping.table.replace(/\]/g, '')}]`,
            timestamp: `[${mapping.timestampColumn.replace(/\]/g, '')}]`,
            value: `[${mapping.valueColumn.replace(/\]/g, '')}]`,
            machine: `[${mapping.machineColumn.replace(/\]/g, '')}]`,
            parameter: `[${mapping.parameterColumn.replace(/\]/g, '')}]`,
        };

        // Bind parameters safely
        request.input('startDate', sql.DateTime, dateRange.from);
        request.input('endDate', sql.DateTime, dateRange.to);

        let machineIdParams: string[] = [];
        machineIds.forEach((id, i) => {
            const paramName = `machineId${i}`;
            request.input(paramName, sql.NVarChar, id);
            machineIdParams.push(`@${paramName}`);
        });

        let parameterFilter = '';
        if (parameterIds && parameterIds.length > 0) {
            let parameterIdParams: string[] = [];
            parameterIds.forEach((id, i) => {
                const paramName = `paramId${i}`;
                request.input(paramName, sql.NVarChar, id);
                parameterIdParams.push(`@${paramName}`);
            });
            parameterFilter = `AND ${safeCols.parameter} IN (${parameterIdParams.join(',')})`;
        }
        
        const queryString = `
            SELECT 
                ${safeCols.parameter} as TagName, 
                ${safeCols.timestamp} as TimeStamp, 
                ${safeCols.value} as TagValue, 
                ${safeCols.machine} as ServerName 
            FROM ${safeCols.table}
            WHERE 
                ${safeCols.timestamp} BETWEEN @startDate AND @endDate
                AND ${safeCols.machine} IN (${machineIdParams.join(',')})
                ${parameterFilter}
            ORDER BY 
                ${safeCols.timestamp} DESC;
        `;

        const result = await request.query(queryString);
        
        const formattedData: ScadaDataPoint[] = result.recordset.map((row: any) => ({
            id: `${row.TagName}-${row.TimeStamp.toISOString()}`,
            timestamp: new Date(row.TimeStamp),
            machine: row.ServerName, 
            parameter: row.TagName,
            value: row.TagValue,
            unit: "N/A", 
        }));
        
        await pool.close();
        
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
    
    if (!dbCreds.server || !dbCreds.databaseName) {
         throw new Error("SCADA Database Server or Database Name is not configured.");
    }
     if (!mapping.table || !mapping.machineColumn || !mapping.parameterColumn) {
        throw new Error("Database table and column mappings are not fully configured in Settings > Data Mapping.");
    }
    
    try {
        const dbConfig: sql.config = {
            user: dbCreds.user || undefined,
            password: dbCreds.password || undefined,
            server: dbCreds.server,
            database: dbCreds.databaseName,
            options: { encrypt: true, trustServerCertificate: true }
        };

        const pool = await sql.connect(dbConfig);
        const request = pool.request();

        // Sanitize column names
        const safeCols = {
            table: `[${mapping.table.replace(/\]/g, '')}]`,
            machine: `[${mapping.machineColumn.replace(/\]/g, '')}]`,
            parameter: `[${mapping.parameterColumn.replace(/\]/g, '')}]`,
        };

        let machineIdParams: string[] = [];
        machineIds.forEach((id, i) => {
            const paramName = `machineId${i}`;
            request.input(paramName, sql.NVarChar, id);
            machineIdParams.push(`@${paramName}`);
        });
        
        const queryString = `
            SELECT DISTINCT ${safeCols.parameter} as TagName FROM ${safeCols.table}
            WHERE ${safeCols.machine} IN (${machineIdParams.join(',')})
            ORDER BY TagName ASC;
        `;
        const result = await request.query(queryString);
        
        const tags: string[] = result.recordset.map((row: any) => row.TagName);
        
        await pool.close();
        
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
    
    if (!dbCreds.server || !dbCreds.databaseName) {
         throw new Error("SCADA Database Server or Database Name is not configured in user settings.");
    }
    
    const dbConfig: sql.config = {
        user: dbCreds.user || undefined,
        password: dbCreds.password || undefined,
        server: dbCreds.server,
        database: dbCreds.databaseName,
        options: { encrypt: true, trustServerCertificate: true, connectionTimeout: 10000 }
    };
    
    try {
        const pool = await sql.connect(dbConfig);

        const tablesResult = await pool.request().query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`);
        const tables: string[] = tablesResult.recordset.map(row => row.TABLE_NAME);

        const columns: { [key: string]: string[] } = {};
        for (const table of tables) {
            // Table names from INFORMATION_SCHEMA are generally safe, but parameterized is best practice if possible.
            // For this metadata query, direct use is common but should be understood as a controlled risk.
            const columnsResult = await pool.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @tableName ORDER BY ORDINAL_POSITION`, { tableName: table });
            columns[table] = columnsResult.recordset.map(row => row.COLUMN_NAME);
        }
        
        await pool.close();
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
    
    if (!dbCreds.server || !dbCreds.databaseName) {
        return { success: false, error: "Server and Database Name are required." };
    }

    try {
        const dbConfig: sql.config = {
            user: dbCreds.user || undefined,
            password: dbCreds.password || undefined,
            server: dbCreds.server,
            database: dbCreds.databaseName,
            options: {
                encrypt: true, 
                trustServerCertificate: true,
                connectionTimeout: 5000 // 5 second timeout
            }
        };

        const pool = await sql.connect(dbConfig);
        await pool.close();
        
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

    