import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  EventType,
  type EventMessage,
  type IPublicClientApplication,
} from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { getMsalInstance, loginRequest, useDevAuth } from './msalConfig';
import { acquireBearerToken } from './ssoAcquire';
import { parseCpsClaims, type UserInfo } from './claims';
import { MalformedTokenError } from './errors';
import {
  clearDevClaims,
  DEV_CLAIMS_EVENT,
  getDevClaims,
  type DevClaims,
} from './devLogin';
import { setAccessTokenProvider } from './getAccessToken';

interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
}

interface AuthContextValue {
  auth: AuthState;
  loginWithSSO: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>(null!);

const UNAUTH: AuthState = { isAuthenticated: false, user: null };

interface AuthProviderProps {
  children: ReactNode;
  /** Test injection point; defaults to real MSAL singleton. */
  pca?: IPublicClientApplication;
}

export function AuthProvider({ children, pca }: AuthProviderProps) {
  // useDevAuth() is evaluated at module-init time; safe to call once here.
  const devMode = useDevAuth();
  const msalInstance = pca ?? (devMode ? null : getMsalInstance());

  if (devMode || msalInstance === null) {
    return <DevAuthInner>{children}</DevAuthInner>;
  }

  // When a test-injected fake PCA is provided, skip MsalProvider to avoid
  // the real PCA initialization path (which calls getConfiguration().auth.clone()).
  if (pca) {
    return <SsoAuthInner pca={pca}>{children}</SsoAuthInner>;
  }

  return (
    <MsalProvider instance={msalInstance}>
      <SsoAuthInner pca={msalInstance}>{children}</SsoAuthInner>
    </MsalProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Dev-mode branch                                                     */
/* ------------------------------------------------------------------ */
function DevAuthInner({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => synthFromDevClaims(getDevClaims()));

  useEffect(() => {
    // Provider for apiClient. Dev mode returns null — apiClient sends
    // X-Dev-Claims directly instead.
    setAccessTokenProvider(() => null);

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DevClaims | null>).detail;
      setAuth(synthFromDevClaims(detail));
    };
    window.addEventListener(DEV_CLAIMS_EVENT, handler);
    return () => window.removeEventListener(DEV_CLAIMS_EVENT, handler);
  }, []);

  const loginWithSSO = useCallback(async () => {
    // No-op in dev mode; user uses DevLoginForm.
    // Surfaced as a console warning so devs notice if they wire SsoButton incorrectly.
    console.warn('[auth] loginWithSSO called in dev mode — no-op');
  }, []);

  const logout = useCallback(async () => {
    clearDevClaims();
    setAuth(UNAUTH);
    if (typeof window !== 'undefined') window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ auth, loginWithSSO, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function synthFromDevClaims(claims: DevClaims | null): AuthState {
  if (!claims) return UNAUTH;
  return {
    isAuthenticated: true,
    user: {
      userId: claims.userId,
      organizationId: claims.organizationId,
      roles: claims.roles,
    },
  };
}

/* ------------------------------------------------------------------ */
/* SSO-mode branch                                                     */
/* ------------------------------------------------------------------ */
function SsoAuthInner({
  children,
  pca,
}: {
  children: ReactNode;
  pca: IPublicClientApplication;
}) {
  const [auth, setAuth] = useState<AuthState>(UNAUTH);

  useEffect(() => {
    // Register accessor for apiClient. In SSO mode, returns an access token
    // from MSAL silent acquire.
    setAccessTokenProvider(async () => {
      const account = pca.getAllAccounts()[0] ?? null;
      try {
        return await acquireBearerToken(pca, account);
      } catch {
        return null;
      }
    });

    // Cold boot: if MSAL has a cached account, hydrate.
    const accounts = pca.getAllAccounts();
    if (accounts.length > 0) {
      hydrateFromAccount(pca, accounts[0]).then(setAuth);
    }

    // Subscribe to LOGIN_SUCCESS so post-redirect lands hydrate properly.
    const cbId = pca.addEventCallback((message: EventMessage) => {
      if (
        message.eventType === EventType.LOGIN_SUCCESS &&
        message.payload &&
        'account' in message.payload &&
        message.payload.account
      ) {
        hydrateFromAccount(pca, message.payload.account as any).then(setAuth);
      } else if (message.eventType === EventType.LOGOUT_SUCCESS) {
        setAuth(UNAUTH);
      }
    });

    return () => {
      if (cbId) pca.removeEventCallback(cbId);
    };
  }, [pca]);

  const loginWithSSO = useCallback(async () => {
    await pca.loginRedirect(loginRequest);
  }, [pca]);

  const logout = useCallback(async () => {
    await pca.logoutRedirect({ postLogoutRedirectUri: '/login' });
  }, [pca]);

  return (
    <AuthContext.Provider value={{ auth, loginWithSSO, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

async function hydrateFromAccount(
  pca: IPublicClientApplication,
  account: any
): Promise<AuthState> {
  try {
    const token = await acquireBearerToken(pca, account);
    if (!token) return UNAUTH;
    const user = parseCpsClaims(token);
    if (import.meta.env.DEV) {
      console.info('[auth] login success', { source: 'sso' });
    }
    return { isAuthenticated: true, user };
  } catch (err) {
    if (err instanceof MalformedTokenError) {
      console.error('[auth] malformed token', { name: err.name });
      pca.logoutRedirect({ postLogoutRedirectUri: '/login?reason=invalid_token' });
    }
    return UNAUTH;
  }
}
