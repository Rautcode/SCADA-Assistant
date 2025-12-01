
'use server';
/**
 * @fileOverview Authenticated Genkit flows for interacting with SCADA data.
 */

import { z } from 'zod';
import { ai } from '../genkit';
import { getUserSettingsFromDb } from '@/services/database-service';
import { reportCriteriaSchema } from '@/components/report-generator/step1-criteria';
import type { ScadaDataPoint, UserSettings } from '@/lib/types/database';
import sql from 'mssql';

// Re-exporting the schema for client-side use
export const ScadaDataCriteriaSchema = reportCriteriaSchema;

// Helper function to get a user's verified settings securely
async function getVerifiedUserSettings(uid: string) {
    const userSettings = await getUserSettingsFromDb(uid);
    if (!userSettings) {
        throw new Error("User settings could not be retrieved.");
    }
    const activeProfileId = userSettings.activeProfileId;
    const activeProfile = userSettings.databaseProfiles?.find(p => p.id === activeProfileId);
    
    if (!activeProfile || !activeProfile.server || !activeProfile.databaseName || !activeProfile.mapping?.table) {
        throw new Error("The active database profile is incomplete. Please configure it in Settings.");
    }
    return { userSettings, activeProfile };
}

const ScadaDataFlowOptionsSchema = z.object({
  authOverride: z.object({ uid: z.string() }).optional(),
});

function isConnectionString(server: string): boolean {
    // A more robust check for connection strings.
    // It looks for key-value pairs separated by semicolons.
    return /.+?=.+?;/i.test(server);
}

// Function to construct the final connection string, injecting credentials if necessary.
function buildConnectionString(server: string, user?: string, password?: string): string {
    let connString = server;
    // Inject username if it exists and is not already in the string
    if (user && !/user id=|uid=/i.test(connString)) {
        connString += `;User ID=${user}`;
    }
    // Inject password if it exists and is not already in the string
    if (password && !/password=|pwd=/i.test(connString)) {
        connString += `;Password=${password}`;
    }
    return connString;
}

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

    const { activeProfile } = await getVerifiedUserSettings(userId);
    const { mapping } = activeProfile;
    const { dateRange, machineIds, parameterIds } = criteria;

    let pool;
    try {
      const connectionConfig = isConnectionString(activeProfile.server!)
        ? { 
            connectionString: buildConnectionString(activeProfile.server!, activeProfile.user, activeProfile.password), 
            options: { trustServerCertificate: true } 
          }
        : {
            user: activeProfile.user || undefined,
            password: activeProfile.password || undefined,
            server: activeProfile.server!,
            database: activeProfile.databaseName!,
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
          };
          
      pool = await sql.connect(connectionConfig);

      let query = `SELECT [${mapping!.timestampColumn}], [${mapping!.machineColumn}], [${mapping!.parameterColumn}], [${mapping!.valueColumn}] FROM [${mapping!.table}] WHERE [${mapping!.timestampColumn}] BETWEEN @startDate AND @endDate`;
      
      if (machineIds.length > 0) {
        query += ` AND [${mapping!.machineColumn}] IN ('${machineIds.join("','")}')`;
      }
      if (parameterIds && parameterIds.length > 0) {
        query += ` AND [${mapping!.parameterColumn}] IN ('${parameterIds.join("','")}')`;
      }

      console.log(`[getScadaDataFlow] Executing query: ${query}`);

      const result = await pool.request()
        .input('startDate', sql.DateTime, dateRange.from)
        .input('endDate', sql.DateTime, dateRange.to)
        .query(query);
      
      console.log(`[getScadaDataFlow] Fetched ${result.recordset.length} records from the database.`);

      return result.recordset.map((row: any) => ({
        id: `${row[mapping!.parameterColumn!]}-${new Date(row[mapping!.timestampColumn!]).toISOString()}`,
        timestamp: new Date(row[mapping!.timestampColumn!]),
        machine: row[mapping!.machineColumn!],
        parameter: row[mapping!.parameterColumn!],
        value: row[mapping!.valueColumn!],
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

    const { activeProfile } = await getVerifiedUserSettings(auth.uid);
    const { mapping } = activeProfile;

    let pool;
    try {
      const connectionConfig = isConnectionString(activeProfile.server!)
        ? { 
            connectionString: buildConnectionString(activeProfile.server!, activeProfile.user, activeProfile.password), 
            options: { trustServerCertificate: true } 
          }
        : {
            user: activeProfile.user || undefined,
            password: activeProfile.password || undefined,
            server: activeProfile.server!,
            database: activeProfile.databaseName!,
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
          };
      
      pool = await sql.connect(connectionConfig);

      let query = `SELECT DISTINCT [${mapping!.parameterColumn}] FROM [${mapping!.table}]`;
      if (machineIds.length > 0) {
        query += ` WHERE [${mapping!.machineColumn}] IN ('${machineIds.join("','")}')`;
      }

      const result = await pool.request().query(query);
      return result.recordset.map(row => row[mapping!.parameterColumn!]);

    } catch (error: any) {
        console.error("SQL Error in getScadaTagsFlow: ", error);
        throw new Error(`Database query failed: ${error.message}`);
    } finally {
        pool?.close();
    }
  }
);
