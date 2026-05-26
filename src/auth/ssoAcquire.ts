import {
  type AccountInfo,
  type IPublicClientApplication,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';
import { loginRequest } from './msalConfig';

/**
 * Get a Bearer access token for the given account. Tries silent acquisition
 * first; on InteractionRequiredAuthError, falls back to acquireTokenRedirect
 * (which navigates the browser to B2C — this function returns null because
 * the caller can't use a token in this case anyway).
 *
 * Returns null when no account is passed (caller is in dev mode or hasn't
 * logged in). Other errors propagate.
 */
export async function acquireBearerToken(
  pca: IPublicClientApplication,
  account: AccountInfo | null
): Promise<string | null> {
  if (!account) return null;

  try {
    const result = await pca.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      // Triggers a full-page redirect to B2C. State is preserved by MSAL.
      await pca.acquireTokenRedirect({ ...loginRequest, account });
      return null;
    }
    throw err;
  }
}
