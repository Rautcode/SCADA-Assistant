
'use server';
/**
 * @fileOverview Authenticated Genkit flows for interacting with SCADA data.
 */

import { z } from 'zod';
import { ai } from '../genkit';
import { getUserSettingsFromDb } from '@/services/database-service';
import { reportCriteriaSchema } from '@/components/report-generator/step1-criteria';
import type { ScadaDataPoint } from '@/lib/types/database';
import sql from 'mssql';

// Re-exporting the schema for client-side use
export const ScadaDataCriteriaSchema = reportCriteriaSchema;

// Helper function to get a user's verified settings securely
async function getVerifiedUserSettings(uid: string) {
    const userSettings = await getUserSettingsFromDb(uid);
    if (!userSettings?.database?.server || !userSettings?.database?.databaseName || !userSettings.dataMapping?.table) {
        throw new Error("Database settings or data mapping are incomplete. Please configure them in Settings.");
    }
    return userSettings;
}

const ScadaDataFlowOptionsSchema = z.object({
  authOverride: z.object({ uid: z.string() }).optional(),
});


// Flow to get SCADA data points based on criteria
export const getScadaDataFlow = ai.defineFlow(
  {
    name: 'getScadaDataFlow',
    inputSchema: z.object({ criteria: ScadaDataCriteriaSchema }),
    outputSchema: z.custom<ScadaDataPoint[]>(),
  },
  async ({ criteria }, { auth, flowOptions }) => {
    const options = ScadaDataFlowOptionsSchema.parse(flowOptions || {});
    let userId: string;

    if (options.authOverride) {
      userId = options.authOverride.uid;
    } else {
      if (!auth) throw new Error("User must be authenticated.");
      userId = auth.uid;
    }
    
    console.log(`[getScadaDataFlow] Initiating data fetch for user: ${userId}`);

    const userSettings = await getVerifiedUserSettings(userId);
    const { database, dataMapping } = userSettings;
    const { dateRange, machineIds, parameterIds } = criteria;

    let pool;
    try {
      pool = await sql.connect({
        user: database.user || undefined,
        password: database.password || undefined,
        server: database.server!,
        database: database.databaseName!,
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
        connectionTimeout: 15000,
        requestTimeout: 15000,
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
            acquireTimeoutMillis: 30000,
        },
      });

      let query = `SELECT [${dataMapping.timestampColumn}], [${dataMapping.machineColumn}], [${dataMapping.parameterColumn}], [${dataMapping.valueColumn}] FROM [${dataMapping.table}] WHERE [${dataMapping.timestampColumn}] BETWEEN @startDate AND @endDate`;
      
      if (machineIds.length > 0) {
        query += ` AND [${dataMapping.machineColumn}] IN ('${machineIds.join("','")}')`;
      }
      if (parameterIds && parameterIds.length > 0) {
        query += ` AND [${dataMapping.parameterColumn}] IN ('${parameterIds.join("','")}')`;
      }

      console.log(`[getScadaDataFlow] Executing query: ${query}`);

      const result = await pool.request()
        .input('startDate', sql.DateTime, dateRange.from)
        .input('endDate', sql.DateTime, dateRange.to)
        .query(query);
      
      console.log(`[getScadaDataFlow] Fetched ${result.recordset.length} records from the database.`);

      return result.recordset.map((row: any) => ({
        id: `${row[dataMapping.parameterColumn!]}-${new Date(row[dataMapping.timestampColumn!]).toISOString()}`,
        timestamp: new Date(row[dataMapping.timestampColumn!]),
        machine: row[dataMapping.machineColumn!],
        parameter: row[dataMapping.parameterColumn!],
        value: row[dataMapping.valueColumn!],
        unit: "N/A", // Unit is not mapped in this version
      }));

    } catch (error: any) {
        console.error("SQL Error in getScadaDataFlow: ", error);
        throw new Error(`Database query failed: ${error.message}`);
    } finally {
        pool?.close();
    }
  }
);


// Flow to get unique SCADA tags/parameters
export const getScadaTagsFlow = ai.defineFlow(
  {
    name: 'getScadaTagsFlow',
    inputSchema: z.object({ machineIds: z.array(z.string()) }),
    outputSchema: z.array(z.string()),
  },
  async ({ machineIds }, { auth }) => {
    if (!auth) throw new Error("User must be authenticated.");

    const userSettings = await getVerifiedUserSettings(auth.uid);
    const { database, dataMapping } = userSettings;

    let pool;
    try {
      pool = await sql.connect({
        user: database.user || undefined,
        password: database.password || undefined,
        server: database.server!,
        database: database.databaseName!,
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
        connectionTimeout: 15000,
        requestTimeout: 15000,
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
            acquireTimeoutMillis: 30000,
        },
      });

      let query = `SELECT DISTINCT [${dataMapping.parameterColumn}] FROM [${dataMapping.table}]`;
      if (machineIds.length > 0) {
        query += ` WHERE [${dataMapping.machineColumn}] IN ('${machineIds.join("','")}')`;
      }

      const result = await pool.request().query(query);
      return result.recordset.map(row => row[dataMapping.parameterColumn!]);

    } catch (error: any) {
        console.error("SQL Error in getScadaTagsFlow: ", error);
        throw new Error(`Database query failed: ${error.message}`);
    } finally {
        pool?.close();
    }
  }
);
