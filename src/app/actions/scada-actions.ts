
'use server';

import type { ScadaDataPoint } from "@/lib/types/database";
import sql from 'mssql';
import nodemailer from 'nodemailer';
import { reportCriteriaSchema } from "@/components/report-generator/step1-criteria";
import { z } from "zod";
import { dataMappingSchema, emailSettingsSchema } from "@/lib/types/database";
import { auth } from "@/auth"; // <-- Import auth from next-auth
import { getUserSettingsFromDb } from "@/services/database-service";


// Types for credentials to be passed around
export type ScadaDbCredentials = {
    server?: string | null;
    databaseName?: string | null;
    user?: string | null;
    password?: string | null;
}
export type SmtpCredentials = z.infer<typeof emailSettingsSchema>;
export type ScadaDataMapping = z.infer<typeof dataMappingSchema>;

// Helper to validate column mappings against the actual schema
async function validateMapping(pool: sql.ConnectionPool, mapping: ScadaDataMapping): Promise<void> {
    if (!mapping.table || !mapping.timestampColumn || !mapping.machineColumn || !mapping.parameterColumn || !mapping.valueColumn) {
        throw new Error("Data mapping is incomplete. Please configure all columns in Settings > Data Mapping.");
    }
    
    // Validate table exists
    const tableCheck = await pool.request()
        .input('tableName', sql.NVarChar, mapping.table)
        .query(`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @tableName`);
    if (tableCheck.recordset.length === 0) {
        throw new Error(`The table "${mapping.table}" does not exist in the database.`);
    }

    // Validate all columns exist in the specified table
    const allColumns = [mapping.timestampColumn, mapping.machineColumn, mapping.parameterColumn, mapping.valueColumn];
    const columnCheckQuery = `
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = @tableName AND COLUMN_NAME IN (${allColumns.map((_, i) => `@col${i}`).join(',')})
    `;
    const request = pool.request().input('tableName', sql.NVarChar, mapping.table);
    allColumns.forEach((col, i) => request.input(`col${i}`, sql.NVarChar, col));
    
    const result = await request.query(columnCheckQuery);
    
    if (result.recordset.length !== allColumns.length) {
        const foundCols = result.recordset.map(r => r.COLUMN_NAME);
        const missingCols = allColumns.filter(c => !foundCols.includes(c));
        throw new Error(`The following columns could not be found in table "${mapping.table}": ${missingCols.join(', ')}. Please check your Data Mapping settings.`);
    }
}


// Server Action to get SCADA data
// This function is now fully self-contained and authenticated. It does not accept credentials as arguments.
type GetScadaDataInput = {
    criteria: z.infer<typeof reportCriteriaSchema>;
}
export async function getScadaData({ criteria }: GetScadaDataInput): Promise<ScadaDataPoint[]> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("User is not authenticated.");
    }
    const userId = session.user.id;

    console.log(`Fetching SCADA data for user ${userId} with criteria:`, criteria);

    const userSettings = await getUserSettingsFromDb(userId);
    const dbCreds = userSettings?.database;
    const mapping = userSettings?.dataMapping;

    if (!dbCreds?.server || !dbCreds?.databaseName) {
         throw new Error("SCADA Database Server or Database Name is not configured in user settings.");
    }
    if (!mapping) {
        throw new Error("SCADA Data Mapping is not configured in user settings.");
    }

    // Prevent invalid SQL if no machines are selected
    if (!criteria.machineIds || criteria.machineIds.length === 0) {
        console.log("No machine IDs provided, returning empty data set.");
        return [];
    }
    
    let pool: sql.ConnectionPool | undefined;
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

        pool = await sql.connect(dbConfig);

        // Securely validate mapping before building query
        await validateMapping(pool, mapping);

        // All mappings are validated, so it's safe to use them now
        const safeCols = {
            table: `[${mapping.table}]`,
            timestamp: `[${mapping.timestampColumn}]`,
            value: `[${mapping.valueColumn}]`,
            machine: `[${mapping.machineColumn}]`,
            parameter: `[${mapping.parameterColumn}]`,
        };

        const request = pool.request();
        const { dateRange, machineIds, parameterIds } = criteria;
        
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
        
        console.log(`Returning ${formattedData.length} data points from live SCADA SQL database.`);
        return formattedData;

    } catch (error: any) {
        console.error("Failed to fetch SCADA data from SQL Server:", error.message);
        // Do not expose raw error.message to the client
        throw new Error(`Database query failed. Please check your connection details and mappings in Settings.`);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}


// Server Action to get SCADA tags
// This function is now fully self-contained and authenticated.
type GetScadaTagsInput = {
    machineIds: string[];
}
export async function getScadaTags({ machineIds }: GetScadaTagsInput): Promise<string[]> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("User is not authenticated.");
    }
    const userId = session.user.id;

    console.log(`Fetching SCADA tags for user ${userId}, machines:`, machineIds);
    if (!machineIds || machineIds.length === 0) {
        return [];
    }
    
    const userSettings = await getUserSettingsFromDb(userId);
    const dbCreds = userSettings?.database;
    const mapping = userSettings?.dataMapping;

    if (!dbCreds?.server || !dbCreds?.databaseName) {
         throw new Error("SCADA Database Server or Database Name is not configured.");
    }
    if (!mapping) {
        throw new Error("SCADA Data Mapping is not configured in user settings.");
    }
    
    let pool: sql.ConnectionPool | undefined;
    try {
        const dbConfig: sql.config = {
            user: dbCreds.user || undefined,
            password: dbCreds.password || undefined,
            server: dbCreds.server,
            database: dbCreds.databaseName,
            options: { encrypt: true, trustServerCertificate: true }
        };

        pool = await sql.connect(dbConfig);
        
        // Securely validate mapping before building query
        await validateMapping(pool, mapping);
        
        const request = pool.request();

        // All mappings are validated, so it's safe to use them
        const safeCols = {
            table: `[${mapping.table}]`,
            machine: `[${mapping.machineColumn}]`,
            parameter: `[${mapping.parameterColumn}]`,
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
        
        console.log(`Returning ${tags.length} unique tags.`);
        return tags;

    } catch (error: any) {
        console.error("Failed to fetch SCADA tags from SQL Server:", error.message);
        throw new Error(`Database query for tags failed. Please check your connection details and mappings in Settings.`);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

// Server Action to get DB schema
// This action is now fully self-contained and authenticated.
export async function getDbSchema(): Promise<{ tables: string[], columns: { [key: string]: string[] } }> {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("User is not authenticated.");
    }
    const userId = session.user.id;

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
        options: { encrypt: true, trustServerCertificate: true, connectionTimeout: 10000 }
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


// Server Action to test SCADA connection
// This action is now fully self-contained and authenticated.
export async function testScadaConnection(): Promise<{ success: boolean, error?: string }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "User is not authenticated." };
    }
    const userId = session.user.id;

    console.log(`Testing SCADA DB connection for user ${userId}...`);

    const userSettings = await getUserSettingsFromDb(userId);
    const dbCreds = userSettings?.database;
    
    if (!dbCreds?.server || !dbCreds?.databaseName) {
        return { success: false, error: "Server and Database Name are required." };
    }
    
    let pool: sql.ConnectionPool | undefined;
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

        pool = await sql.connect(dbConfig);
        
        console.log("SCADA DB connection test successful.");
        return { success: true };

    } catch (error: any) {
        console.error("SCADA DB connection test failed:", error.message);
        return { success: false, error: "Connection failed. Please check credentials and network." };
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}


// Server Action to test SMTP connection
// This action is now fully self-contained and authenticated.
export async function testSmtpConnection(): Promise<{ success: boolean, error?: string }> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "User is not authenticated." };
    }
    const userId = session.user.id;

    console.log(`Testing SMTP connection for user ${userId}...`);

    const userSettings = await getUserSettingsFromDb(userId);
    const emailCreds = userSettings?.email;
    
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
            connectionTimeout: 10000, // 10 second timeout
            tls: {
                rejectUnauthorized: true,
            }
        });

        await transporter.verify();
        
        console.log("SMTP connection test successful.");
        return { success: true };

    } catch (error: any) {
        console.error("SMTP connection test failed:", error.message);
        return { success: false, error: "SMTP connection failed. Check credentials and firewall rules." };
    }
}

      