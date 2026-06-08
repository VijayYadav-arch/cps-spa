import { getAccessToken } from '@/auth/getAccessToken';
import { useDevAuth } from '@/auth/msalConfig';
import { getDevClaims, serializeDevClaims } from '@/auth/devLogin';

/**
 * Builds the auth headers the staff-side `apiClient` would attach in its
 * request interceptor. Used by streaming consumers that can't pass through
 * axios because they need a `fetch`-backed ReadableStream.
 *
 * Mirrors `src/api/client.ts` exactly:
 *   - dev-auth mode -> `X-Dev-Claims` header
 *   - prod mode     -> `Authorization: Bearer <jwt>`
 *
 * Returns an empty object when no token is available (e.g. token expired,
 * not yet logged in) -- the call will 401 + the SSE consumer surfaces it
 * via the standard pre-stream JSON envelope path.
 */
export async function staffAuthHeaders(): Promise<Record<string, string>> {
  if (useDevAuth()) {
    const claims = getDevClaims();
    if (claims) {
      return { 'X-Dev-Claims': serializeDevClaims(claims) };
    }
    return {};
  }
  const token = await getAccessToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
