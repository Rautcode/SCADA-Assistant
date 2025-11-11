import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This default client is used for flows that don't get an API key passed in.
// For flows that need user-specific keys, the key is passed in and a new client is created dynamically.
export const ai = genkit({
  plugins: [googleAI({
    apiKey: process.env.GEMINI_API_KEY,
  })],
});
