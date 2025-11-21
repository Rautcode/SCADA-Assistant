
import { getAuth } from 'firebase/auth';

/**
 * A wrapper around the global `fetch` function that automatically adds the
 * Firebase Authentication ID token to the request headers.
 *
 * @param originalFetch The original window.fetch function.
 * @returns A modified fetch function.
 */
export function fetchWithAuth(originalFetch: typeof window.fetch): typeof window.fetch {
  const auth = getAuth();

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const user = auth.currentUser;

    if (!user) {
      // If there's no user, just use the original fetch without modification.
      return originalFetch(input, init);
    }

    try {
      const token = await user.getIdToken();
      const headers = new Headers(init?.headers);
      headers.set('Authorization', `Bearer ${token}`);

      const newInit: RequestInit = {
        ...init,
        headers,
      };

      return originalFetch(input, newInit);
    } catch (error) {
      console.error('Error getting auth token for fetch:', error);
      // If token retrieval fails, proceed with the original request without the auth header.
      return originalFetch(input, init);
    }
  };
}
