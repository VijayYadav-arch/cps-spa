import type {
  AccountInfo,
  AuthenticationResult,
  EventCallbackFunction,
  IPublicClientApplication,
  PopupRequest,
  RedirectRequest,
  SilentRequest,
} from '@azure/msal-browser';
import { vi } from 'vitest';

/**
 * Test double for IPublicClientApplication. Implements only the surface
 * AuthContext + ssoAcquire touch. Methods are vi.fn() so tests can assert
 * call args.
 *
 * Pass to AuthProvider via its `pca` prop:
 *
 *     const pca = createFakePca({ accounts: [], tokenResponses: [] });
 *     render(<AuthProvider pca={pca}>...</AuthProvider>);
 */
export interface FakePcaOptions {
  /** Accounts returned by getAllAccounts(). Defaults to []. */
  accounts?: AccountInfo[];
  /**
   * Successive responses returned by acquireTokenSilent(). Each call shifts
   * one off the queue. If the front of the queue is an Error, it's thrown.
   */
  tokenResponses?: Array<AuthenticationResult | Error>;
}

export function createFakePca(opts: FakePcaOptions = {}): IPublicClientApplication {
  const accounts = opts.accounts ?? [];
  const queue = [...(opts.tokenResponses ?? [])];
  const eventCallbacks: EventCallbackFunction[] = [];

  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    handleRedirectPromise: vi.fn().mockResolvedValue(null),
    getAllAccounts: vi.fn(() => accounts),
    getActiveAccount: vi.fn(() => accounts[0] ?? null),
    setActiveAccount: vi.fn(),
    loginRedirect: vi.fn(async (_: RedirectRequest) => undefined),
    loginPopup: vi.fn(async (_: PopupRequest) => ({} as AuthenticationResult)),
    logoutRedirect: vi.fn(async () => undefined),
    logoutPopup: vi.fn(async () => undefined),
    acquireTokenSilent: vi.fn(async (_: SilentRequest) => {
      const next = queue.shift();
      if (next instanceof Error) throw next;
      if (!next) throw new Error('No more tokenResponses queued in fake PCA');
      return next;
    }),
    acquireTokenRedirect: vi.fn(async (_: RedirectRequest) => undefined),
    acquireTokenPopup: vi.fn(async () => ({} as AuthenticationResult)),
    addEventCallback: vi.fn((cb: EventCallbackFunction) => {
      eventCallbacks.push(cb);
      return 'cb-id';
    }),
    removeEventCallback: vi.fn(),
    enableAccountStorageEvents: vi.fn(),
    disableAccountStorageEvents: vi.fn(),
    getLogger: vi.fn() as any,
    setLogger: vi.fn(),
    getConfiguration: vi.fn() as any,
    addPerformanceCallback: vi.fn(() => 'perf-id'),
    removePerformanceCallback: vi.fn(),
    getTokenCache: vi.fn() as any,
    /**
     * Test-only helper to fire MSAL events to all registered callbacks.
     * Use this in tests to simulate LOGIN_SUCCESS or other events.
     */
    _fireEvent: ((event: any) => {
      for (const cb of eventCallbacks) cb(event);
    }) as any,
  } as unknown as IPublicClientApplication & { _fireEvent: (e: any) => void };
}

export function fakeAccount(overrides: Partial<AccountInfo> = {}): AccountInfo {
  return {
    homeAccountId: 'home-1',
    environment: 'login.microsoftonline.com',
    tenantId: 'tenant-1',
    username: 'user@test.com',
    localAccountId: 'local-1',
    ...overrides,
  } as AccountInfo;
}

export function fakeTokenResponse(token: string): AuthenticationResult {
  return {
    accessToken: token,
    account: fakeAccount(),
    authority: '',
    expiresOn: new Date(Date.now() + 60_000),
    fromCache: false,
    idToken: token,
    idTokenClaims: {},
    scopes: ['cps-api/access_as_user'],
    tenantId: 'tenant-1',
    tokenType: 'Bearer',
    uniqueId: 'unique-1',
  } as AuthenticationResult;
}
