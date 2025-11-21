
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This default client has no API key.
// It is used for flows that do not require authentication, like `createNewTemplateFlow`.
// Flows that need to call a Gemini model MUST be passed an API key and
// create their own dynamic client.
export const ai = genkit({
  plugins: [googleAI()],
});
