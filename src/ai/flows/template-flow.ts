
'use server';
/**
 * @fileOverview An authenticated Genkit flow for creating new report templates.
 */

import { createNewTemplateInDb } from '@/services/database-service';
import { defineFlow } from 'genkit';
import { z } from 'genkit';

const NewTemplateSchema = z.object({
    name: z.string().min(1, "Template name is required."),
    description: z.string().min(1, "Description is required."),
    category: z.string().min(1, "Category is required."),
    thumbnailUrl: z.string().url("A valid thumbnail URL is required."),
});
type NewTemplate = z.infer<typeof NewTemplateSchema>;

export async function createNewTemplate(template: NewTemplate) {
    return createNewTemplateFlow(template);
}

// This flow is now authenticated to prevent anonymous database writes.
const createNewTemplateFlow = defineFlow(
    {
        name: 'createNewTemplateFlow',
        inputSchema: NewTemplateSchema,
        outputSchema: z.void(),
        auth: {
            required: true,
        }
    },
    async (template) => {
        await createNewTemplateInDb(template);
    }
);

    
