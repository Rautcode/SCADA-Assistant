
'use server';
/**
 * @fileOverview A unified, authenticated Genkit flow for checking the health of all external services.
 */

import { z } from 'zod';
import { ai } from '../genkit';
import { getUserSettingsFromDb } from '@/services/database-service';
import sql from 'mssql';
import nodemailer from 'nodemailer';
import { googleAI } from '@genkit-ai/googleai';

// Common types for health checks
type Status = 'operational' | 'error' | 'untested' | 'testing';
type HealthCheck = {
    status: Status;
    message: string;
    details?: Record<string, string | number | undefined>;
};

// Output schema for the entire health check
const HealthCheckStatusSchema = z.object({
    db: z.custom<HealthCheck>(),
    ai: z.custom<HealthCheck>(),
    smtp: z.custom<HealthCheck>(),
});

function isConnectionString(server: string): boolean {
    return /.+?=.+?;/i.test(server);
}

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


// The unified health check flow
export const getHealthCheckStatusFlow = ai.defineFlow(
  {
    name: 'getHealthCheckStatusFlow',
    inputSchema: z.void(),
    outputSchema: HealthCheckStatusSchema,
    auth: { firebase: true },
  },
  async (_, { auth }) => {
    if (!auth) {
        throw new Error("User must be authenticated.");
    }
    const userId = auth.uid;

    const userSettings = await getUserSettingsFromDb(userId);
    const activeProfile = userSettings?.databaseProfiles?.find(p => p.id === userSettings.activeProfileId);
    const smtpConfig = userSettings?.email;
    const apiKey = userSettings?.apiKey;

    // 1. Database Health Check
    let dbHealth: HealthCheck;
    if (!activeProfile?.server || !activeProfile.databaseName) {
        dbHealth = { status: 'error', message: 'Database profile is not configured. Please complete the setup in Settings.', details: { profile: activeProfile?.name }};
    } else {
        let pool;
        try {
            const connectionConfig = isConnectionString(activeProfile.server)
                ? { connectionString: buildConnectionString(activeProfile.server, activeProfile.user, activeProfile.password), options: { trustServerCertificate: true, encrypt: false }, connectionTimeout: 5000, requestTimeout: 5000 }
                : { user: activeProfile.user, password: activeProfile.password, server: activeProfile.server, database: activeProfile.databaseName, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000, requestTimeout: 5000 };
            
            const startTime = Date.now();
            pool = await sql.connect(connectionConfig);
            const endTime = Date.now();

            dbHealth = { 
                status: 'operational', 
                message: `Successfully connected to the database. Latency: ${endTime - startTime}ms`,
                details: { profile: activeProfile.name, server: activeProfile.server, database: activeProfile.databaseName, latency: `${endTime - startTime}ms` }
            };
        } catch (error: any) {
             dbHealth = { 
                status: 'error', 
                message: `Connection failed: ${error.message}`,
                details: { profile: activeProfile.name, server: activeProfile.server, database: activeProfile.databaseName }
            };
        } finally {
            pool?.close();
        }
    }

    // 2. AI Service (Gemini) Health Check
    let aiHealth: HealthCheck;
    if (!apiKey) {
        aiHealth = { status: 'error', message: 'Gemini API key is not configured. Please add it in Settings.' };
    } else {
        try {
            // Use a simple, low-cost model for a health check
            await ai.generate({
                model: 'gemini-pro',
                prompt: "Health check",
                output: { format: 'text' },
                config: { maxOutputTokens: 5 }
            });
            aiHealth = { status: 'operational', message: 'Gemini API key is valid and service is reachable.', details: { model: 'gemini-pro' } };
        } catch (error: any) {
            aiHealth = { status: 'error', message: `API key verification failed. The key may be invalid or expired. Error: ${error.message}` };
        }
    }

    // 3. SMTP Health Check
    let smtpHealth: HealthCheck;
    if (!smtpConfig?.smtpHost || !smtpConfig.smtpPort || !smtpConfig.smtpUser) {
        smtpHealth = { status: 'error', message: 'SMTP is not configured. Email features are disabled.', details: { configured: "No" } };
    } else {
        const transporter = nodemailer.createTransport({
            host: smtpConfig.smtpHost,
            port: smtpConfig.smtpPort,
            secure: smtpConfig.smtpPort === 465,
            auth: { user: smtpConfig.smtpUser, pass: smtpConfig.smtpPass },
            tls: { rejectUnauthorized: false }
        });
        try {
            await transporter.verify();
            smtpHealth = { 
                status: 'operational', 
                message: 'Successfully connected to the SMTP server.',
                details: { host: smtpConfig.smtpHost, port: smtpConfig.smtpPort, user: smtpConfig.smtpUser }
            };
        } catch (error: any) {
            smtpHealth = { 
                status: 'error', 
                message: `SMTP verification failed: ${error.message}`,
                details: { host: smtpConfig.smtpHost, port: smtpConfig.smtpPort, user: smtpConfig.smtpUser }
            };
        }
    }
    
    return { db: dbHealth, ai: aiHealth, smtp: smtpHealth };
  }
);
