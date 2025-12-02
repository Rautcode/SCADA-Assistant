/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

import { nextJSHandler } from '@genkit-ai/next';
import "@/ai/dev"

export const POST = nextJSHandler({
  // This is the critical fix. It tells the Genkit backend to
  // use Firebase to verify the user's identity from the request.
  auth: {
    firebase: true,
  }
});
