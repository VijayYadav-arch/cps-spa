import { type Configuration, PublicClientApplication } from '@azure/msal-browser';

/**
 * True when the SPA build has a B2C client ID configured. Single source of truth
 * for "is B2C wired up in this environment."
 */
export function isB2CConfigured(): boolean {
  return Boolean(import.meta.env.VITE_B2C_CLIENT_ID);
}

/**
 * Master switch for dev auth mode. True when B2C is not configured OR when
 * VITE_DEV_LOGIN explicitly overrides. Production builds MUST set
 * VITE_DEV_LOGIN=false so the override can never accidentally activate.
 *
 * Consumed by AuthContext (chooses dev vs SSO flow), apiClient (sets
 * X-Dev-Claims vs Bearer), and Login page (renders DevLoginForm vs SsoButton).
 */
export function useDevAuth(): boolean {
  return !isB2CConfigured() || import.meta.env.VITE_DEV_LOGIN === 'true';
}

export function buildMsalConfig(): Configuration {
  const instance = (import.meta.env.VITE_B2C_INSTANCE ?? '').replace(/\/+$/, '');
  const domain = import.meta.env.VITE_B2C_DOMAIN ?? '';
  const policy = import.meta.env.VITE_B2C_SUSI_POLICY ?? 'B2C_1A_signup_signin';
  const authority = [instance, domain, policy].filter(Boolean).join('/');
  return {
    auth: {
      clientId: import.meta.env.VITE_B2C_CLIENT_ID ?? '',
      authority,
      knownAuthorities: extractAuthorityHost(instance),
      redirectUri: import.meta.env.VITE_B2C_REDIRECT_URI ?? '/auth/callback',
    },
    cache: {
      cacheLocation: 'sessionStorage',
    },
  };
}

export const loginRequest = {
  scopes: [import.meta.env.VITE_B2C_API_SCOPE ?? ''].filter(Boolean),
};

function extractAuthorityHost(url: string): string[] {
  try {
    return [new URL(url).hostname];
  } catch {
    return ['login.microsoftonline.com'];
  }
}

let _instance: PublicClientApplication | null = null;
export function getMsalInstance(): PublicClientApplication {
  if (!_instance) {
    _instance = new PublicClientApplication(buildMsalConfig());
  }
  return _instance;
}

/** Test-only — reset cached singleton between tests. */
export function _resetMsalInstanceForTests(): void {
  _instance = null;
}
