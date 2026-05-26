# cps-spa MSAL-Only Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead email+password login code in `cps-spa` with Azure AD B2C as the sole staff login path, add a `DevLoginForm` driving `X-Dev-Claims` for local testing, and provision the B2C tenant via Bicep + IEF custom policies + a runbook.

**Architecture:** Single `AuthContext` wrapping `MsalProvider`. A `useDevAuth()` predicate (= `!isB2CConfigured() || VITE_DEV_LOGIN === 'true'`) is the single switch consumed by `AuthContext`, `apiClient`, and the Login page. Production uses B2C tokens via MSAL; dev uses `X-Dev-Claims` against the existing `DevBypassAuthHandler`. Zero backend code changes; all backend B2C wiring (`B2CValidateController`, `B2COrApiKey` policy scheme, `DevBypassAuthHandler`) was already shipped.

**Tech Stack:** React 18 + Vite 6 + TypeScript 5 + react-router-dom 6 + axios + vitest 2 + @testing-library/react + `@azure/msal-browser` + `@azure/msal-react` (new). Backend infra: Bicep + Azure AD B2C IEF custom policies + Microsoft.Graph REST.

**Spec:** [`docs/superpowers/specs/2026-05-26-cps-spa-msal-only-design.md`](../specs/2026-05-26-cps-spa-msal-only-design.md) (committed `8dc9ca1`)

---

## File Structure

### Phase 1 — cps-spa MSAL scaffolding (PR `feature/auth-msal-scaffolding`)

**Create:**
- `src/auth/msalConfig.ts` — `isB2CConfigured()`, `useDevAuth()`, `buildMsalConfig()`, `getMsalInstance()`, `loginRequest`
- `src/auth/errors.ts` — `MalformedTokenError`, `DevClaimsValidationError`
- `src/auth/claims.ts` — `parseCpsClaims(token): UserInfo`, exported `UserInfo` type
- `src/auth/getAccessToken.ts` — `setAccessTokenProvider`, `getAccessToken`
- `src/auth/devLogin.ts` — `DevClaims` type, `setDevClaims`, `getDevClaims`, `clearDevClaims`, `serializeDevClaims`
- `src/auth/ssoAcquire.ts` — `acquireBearerToken(pca, account)` with silent-then-redirect fallback
- `src/auth/__tests__/fakes/msal.ts` — `createFakePca({ accounts, tokenResponses })` test helper
- `src/auth/__tests__/msalConfig.test.ts`
- `src/auth/__tests__/claims.test.ts`
- `src/auth/__tests__/getAccessToken.test.ts`
- `src/auth/__tests__/devLogin.test.ts`
- `src/auth/__tests__/ssoAcquire.test.ts`

**Modify:**
- `src/auth/AuthContext.tsx` — full rewrite (wraps `MsalProvider`, branches on `useDevAuth()`)
- `src/auth/useAuth.ts` — exposes `loginWithSSO`, removes `login` (password)
- `src/auth/__tests__/AuthContext.test.tsx` — rewrite
- `src/api/client.ts` — async interceptor branching on `useDevAuth()`
- `src/api/__tests__/client.test.ts` — covers both branches
- `src/__tests__/App.test.tsx` — use `setAccessTokenProvider` + `setDevClaims` instead of sessionStorage hacks
- `package.json` — add `@azure/msal-browser` + `@azure/msal-react`
- `package-lock.json` — npm install result

### Phase 2 — cps-spa Login UI rewrite (PR `feature/auth-login-ui`)

**Create:**
- `src/auth/SsoButton.tsx` — "Sign in with company SSO" button
- `src/auth/DevLoginForm.tsx` — dev identity picker form
- `src/auth/__tests__/SsoButton.test.tsx`
- `src/auth/__tests__/DevLoginForm.test.tsx`

**Modify:**
- `src/pages/Login.tsx` — full rewrite (renders SsoButton or DevLoginForm based on `useDevAuth()`)
- `src/pages/__tests__/Login.test.tsx` — rewrite
- `.env.example` — add seven `VITE_*` env vars

### Phase 3 — cps-dotnet B2C infrastructure (PR `feature/b2c-infra`)

**Create:**
- `infra/b2c/main.bicep`
- `infra/b2c/app-registration-api.bicep`
- `infra/b2c/app-registration-spa.bicep`
- `infra/b2c/api-key-secret.bicep`
- `infra/b2c/parameters/dev.bicepparam`
- `infra/b2c/parameters/staging.bicepparam`
- `infra/b2c/parameters/prod.bicepparam`
- `infra/b2c/custom-policy-trustframework/TrustFrameworkBase.xml`
- `infra/b2c/custom-policy-trustframework/TrustFrameworkExtensions.xml`
- `infra/b2c/custom-policy-trustframework/SignUpOrSignin.xml`
- `infra/b2c/replace-placeholders.ps1`
- `infra/b2c/README.md` (the runbook)

**Modify:**
- `.github/workflows/` (or equivalent CI config) — add `az deployment group what-if` + `xmllint` jobs for Bicep + XML lints

---

# Phase 1: cps-spa MSAL Scaffolding

**PR scope:** New auth utility modules + AuthContext/apiClient rewrite. No user-visible UI change (Login page still renders the existing dead form — we don't touch it until Phase 2). Existing dev workflow via `Auth:DevBypass:Enabled=true` keeps working because apiClient drops the Authorization header in dev mode.

**Branch:** `feature/auth-msal-scaffolding` off `cps-spa/main`.

## Task 1.0: Create the feature branch

- [ ] **Step 1: Verify clean working tree and upstream main**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa status --short
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa fetch origin
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa log origin/main --oneline -5
```

Expected: empty status, recent commits visible.

- [ ] **Step 2: Create feature branch**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa checkout -b feature/auth-msal-scaffolding origin/main
```

Expected: `Switched to a new branch 'feature/auth-msal-scaffolding'`.

## Task 1.1: Add MSAL dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (auto)

- [ ] **Step 1: Install MSAL packages**

```bash
cd C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa
npm install @azure/msal-browser@^3.27.0 @azure/msal-react@^2.2.0
```

Expected: packages added; lock file regenerated.

- [ ] **Step 2: Verify nothing else broke**

```bash
npm test
```

Expected: PASS (existing test suite — nothing imports MSAL yet).

- [ ] **Step 3: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add package.json package-lock.json
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "chore(deps): add @azure/msal-browser + @azure/msal-react for B2C auth"
```

## Task 1.2: Create `msalConfig.ts` with `isB2CConfigured()` + `useDevAuth()`

**Files:**
- Create: `src/auth/msalConfig.ts`
- Create: `src/auth/__tests__/msalConfig.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/auth/__tests__/msalConfig.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('msalConfig', () => {
  const ORIGINAL_ENV = { ...import.meta.env };

  afterEach(() => {
    // restore env
    Object.keys(import.meta.env).forEach((k) => delete (import.meta.env as any)[k]);
    Object.assign(import.meta.env, ORIGINAL_ENV);
    vi.resetModules();
  });

  it('isB2CConfigured returns false when VITE_B2C_CLIENT_ID is empty', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    const { isB2CConfigured } = await import('@/auth/msalConfig');
    expect(isB2CConfigured()).toBe(false);
  });

  it('isB2CConfigured returns true when VITE_B2C_CLIENT_ID is set', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    const { isB2CConfigured } = await import('@/auth/msalConfig');
    expect(isB2CConfigured()).toBe(true);
  });

  it('useDevAuth returns true when VITE_B2C_CLIENT_ID is empty', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
    const { useDevAuth } = await import('@/auth/msalConfig');
    expect(useDevAuth()).toBe(true);
  });

  it('useDevAuth returns false when B2C configured and VITE_DEV_LOGIN is unset', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    delete (import.meta.env as any).VITE_DEV_LOGIN;
    const { useDevAuth } = await import('@/auth/msalConfig');
    expect(useDevAuth()).toBe(false);
  });

  it('useDevAuth returns true when VITE_DEV_LOGIN=true overrides B2C configured', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    (import.meta.env as any).VITE_DEV_LOGIN = 'true';
    const { useDevAuth } = await import('@/auth/msalConfig');
    expect(useDevAuth()).toBe(true);
  });

  it('buildMsalConfig composes authority from instance + domain + policy', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    (import.meta.env as any).VITE_B2C_INSTANCE = 'https://contoso.b2clogin.com/tfp';
    (import.meta.env as any).VITE_B2C_DOMAIN = 'contoso.onmicrosoft.com';
    (import.meta.env as any).VITE_B2C_SUSI_POLICY = 'B2C_1A_signup_signin';
    const { buildMsalConfig } = await import('@/auth/msalConfig');
    const cfg = buildMsalConfig();
    expect(cfg.auth.clientId).toBe('abc-123');
    expect(cfg.auth.authority).toBe(
      'https://contoso.b2clogin.com/tfp/contoso.onmicrosoft.com/B2C_1A_signup_signin'
    );
    expect(cfg.auth.knownAuthorities).toEqual(['contoso.b2clogin.com']);
    expect(cfg.cache?.cacheLocation).toBe('sessionStorage');
  });

  it('buildMsalConfig falls back to safe defaults when env vars missing', async () => {
    delete (import.meta.env as any).VITE_B2C_INSTANCE;
    delete (import.meta.env as any).VITE_B2C_DOMAIN;
    const { buildMsalConfig } = await import('@/auth/msalConfig');
    const cfg = buildMsalConfig();
    expect(cfg.auth.knownAuthorities).toEqual(['login.microsoftonline.com']);
  });
});
```

- [ ] **Step 2: Run the tests, verify all fail**

```bash
npm test -- --run src/auth/__tests__/msalConfig.test.ts
```

Expected: 7 tests FAIL with "Cannot find module '@/auth/msalConfig'".

- [ ] **Step 3: Implement `msalConfig.ts`**

Create `src/auth/msalConfig.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests, verify all pass**

```bash
npm test -- --run src/auth/__tests__/msalConfig.test.ts
```

Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/auth/msalConfig.ts src/auth/__tests__/msalConfig.test.ts
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "feat(auth): add msalConfig with isB2CConfigured + useDevAuth predicates"
```

## Task 1.3: Create `errors.ts`

**Files:**
- Create: `src/auth/errors.ts`

This module is too small to TDD usefully (just two class definitions). Direct create.

- [ ] **Step 1: Create `src/auth/errors.ts`**

```ts
/**
 * Thrown by claims.ts when a JWT payload is missing required claims or
 * cannot be base64-decoded. Treated as an auth failure; AuthContext
 * clears state and redirects to /login?reason=invalid_token.
 */
export class MalformedTokenError extends Error {
  constructor(message: string = 'Token claims could not be parsed') {
    super(message);
    this.name = 'MalformedTokenError';
  }
}

/**
 * Thrown by DevLoginForm submit validation when a field is invalid.
 * Captured field name so the form can render the error next to the
 * offending input.
 */
export class DevClaimsValidationError extends Error {
  constructor(public readonly field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'DevClaimsValidationError';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/auth/errors.ts
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "feat(auth): add MalformedTokenError + DevClaimsValidationError"
```

## Task 1.4: Create `claims.ts` with `parseCpsClaims`

**Files:**
- Create: `src/auth/claims.ts`
- Create: `src/auth/__tests__/claims.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/auth/__tests__/claims.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseCpsClaims } from '@/auth/claims';
import { MalformedTokenError } from '@/auth/errors';

/** Build a minimal JWT with a custom payload. Signature is fake. */
function makeJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

describe('parseCpsClaims', () => {
  it('extracts userId, organizationId, and roles from B2C extension claims', () => {
    const token = makeJwt({
      extension_userId: '42',
      extension_organizationId: '7',
      extension_rbac_role: 'billing_admin',
    });
    expect(parseCpsClaims(token)).toEqual({
      userId: 42,
      organizationId: 7,
      roles: ['billing_admin'],
    });
  });

  it('extracts from CPS-native claim names as fallback', () => {
    const token = makeJwt({
      userId: 99,
      organizationId: 5,
      rbac_role: 'clinician',
    });
    expect(parseCpsClaims(token)).toEqual({
      userId: 99,
      organizationId: 5,
      roles: ['clinician'],
    });
  });

  it('handles rbac_role as a string[] (multi-role users)', () => {
    const token = makeJwt({
      extension_userId: '1',
      extension_rbac_role: ['billing_admin', 'system_admin'],
    });
    expect(parseCpsClaims(token).roles).toEqual(['billing_admin', 'system_admin']);
  });

  it('handles comma-separated rbac_role string', () => {
    const token = makeJwt({
      extension_userId: '1',
      extension_rbac_role: 'billing_admin,system_admin',
    });
    expect(parseCpsClaims(token).roles).toEqual(['billing_admin', 'system_admin']);
  });

  it('returns roles = [] when no rbac_role claim is present', () => {
    const token = makeJwt({ extension_userId: '1' });
    expect(parseCpsClaims(token).roles).toEqual([]);
  });

  it('omits organizationId when claim is missing', () => {
    const token = makeJwt({ extension_userId: '1' });
    const result = parseCpsClaims(token);
    expect(result.organizationId).toBeUndefined();
  });

  it('throws MalformedTokenError when userId claim is missing', () => {
    const token = makeJwt({ extension_organizationId: '7' });
    expect(() => parseCpsClaims(token)).toThrow(MalformedTokenError);
  });

  it('throws MalformedTokenError when userId is non-numeric', () => {
    const token = makeJwt({ extension_userId: 'not-a-number' });
    expect(() => parseCpsClaims(token)).toThrow(MalformedTokenError);
  });

  it('throws MalformedTokenError on malformed JWT (not three parts)', () => {
    expect(() => parseCpsClaims('not.a.valid.jwt.string')).toThrow(MalformedTokenError);
  });

  it('throws MalformedTokenError when payload is not valid JSON', () => {
    const garbage = `header.${btoa('not json at all')}.sig`;
    expect(() => parseCpsClaims(garbage)).toThrow(MalformedTokenError);
  });
});
```

- [ ] **Step 2: Run the tests, verify all fail**

```bash
npm test -- --run src/auth/__tests__/claims.test.ts
```

Expected: 10 tests FAIL — `parseCpsClaims is not a function` or `Cannot find module '@/auth/claims'`.

- [ ] **Step 3: Implement `claims.ts`**

Create `src/auth/claims.ts`:

```ts
import { MalformedTokenError } from './errors';

export interface UserInfo {
  userId: number;
  organizationId?: number;
  roles: string[];
}

/**
 * Parses a JWT payload into the SPA's UserInfo shape. Works for both B2C
 * tokens (claims prefixed with `extension_`) and CPS-native tokens (no
 * prefix). Throws MalformedTokenError on any parse failure.
 *
 * Does NOT verify the signature — that's the backend's responsibility.
 * This is purely for reading the SPA's local view of the user's identity.
 */
export function parseCpsClaims(token: string): UserInfo {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new MalformedTokenError('Token is not a three-part JWT');
  }

  let payload: Record<string, unknown>;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    payload = JSON.parse(atob(padded));
  } catch {
    throw new MalformedTokenError('Token payload is not valid base64-encoded JSON');
  }

  const userIdRaw = pickFirst(payload, ['extension_userId', 'userId']);
  if (userIdRaw == null) {
    throw new MalformedTokenError('Missing userId claim');
  }
  const userId = Number(userIdRaw);
  if (Number.isNaN(userId)) {
    throw new MalformedTokenError('userId claim is not numeric');
  }

  const orgIdRaw = pickFirst(payload, ['extension_organizationId', 'organizationId']);
  const organizationId = orgIdRaw != null ? Number(orgIdRaw) : undefined;

  const rolesRaw = pickFirst(payload, ['extension_rbac_role', 'rbac_role']);
  return { userId, organizationId, roles: normalizeRoles(rolesRaw) };
}

function pickFirst(payload: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in payload && payload[k] != null) return payload[k];
  }
  return undefined;
}

function normalizeRoles(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((r): r is string => typeof r === 'string');
  }
  if (typeof raw === 'string') {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}
```

- [ ] **Step 4: Run the tests, verify all pass**

```bash
npm test -- --run src/auth/__tests__/claims.test.ts
```

Expected: 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/auth/claims.ts src/auth/__tests__/claims.test.ts
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "feat(auth): add parseCpsClaims with B2C + native claim support"
```

## Task 1.5: Create `getAccessToken.ts`

**Files:**
- Create: `src/auth/getAccessToken.ts`
- Create: `src/auth/__tests__/getAccessToken.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/auth/__tests__/getAccessToken.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAccessToken,
  setAccessTokenProvider,
  _resetAccessTokenProviderForTests,
} from '@/auth/getAccessToken';

describe('getAccessToken accessor', () => {
  beforeEach(() => {
    _resetAccessTokenProviderForTests();
  });

  it('returns null when no provider is registered', async () => {
    expect(await getAccessToken()).toBeNull();
  });

  it('returns the provider value when registered', async () => {
    setAccessTokenProvider(() => Promise.resolve('tok-1'));
    expect(await getAccessToken()).toBe('tok-1');
  });

  it('supports synchronous provider returning a string', async () => {
    setAccessTokenProvider(() => 'sync-tok');
    expect(await getAccessToken()).toBe('sync-tok');
  });

  it('returns null when provider resolves to null', async () => {
    setAccessTokenProvider(() => Promise.resolve(null));
    expect(await getAccessToken()).toBeNull();
  });

  it('replacing the provider overwrites previous value', async () => {
    setAccessTokenProvider(() => 'first');
    setAccessTokenProvider(() => 'second');
    expect(await getAccessToken()).toBe('second');
  });

  it('returns null and does not throw if provider throws', async () => {
    setAccessTokenProvider(() => {
      throw new Error('boom');
    });
    expect(await getAccessToken()).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests, verify all fail**

```bash
npm test -- --run src/auth/__tests__/getAccessToken.test.ts
```

Expected: 6 tests FAIL.

- [ ] **Step 3: Implement `getAccessToken.ts`**

Create `src/auth/getAccessToken.ts`:

```ts
/**
 * Module-scoped accessor that decouples axios from React state. AuthContext
 * registers its token provider on mount; apiClient calls getAccessToken()
 * in the request interceptor.
 *
 * Returns null when no provider is registered or when the provider throws.
 * Production code should never throw from the provider, but defensive
 * null-return prevents one slow API call from corrupting request state.
 */
type Provider = () => string | null | Promise<string | null>;

let _provider: Provider | null = null;

export function setAccessTokenProvider(fn: Provider): void {
  _provider = fn;
}

export async function getAccessToken(): Promise<string | null> {
  if (!_provider) return null;
  try {
    const result = _provider();
    return await Promise.resolve(result);
  } catch {
    return null;
  }
}

/** Test-only — reset between tests. */
export function _resetAccessTokenProviderForTests(): void {
  _provider = null;
}
```

- [ ] **Step 4: Run the tests, verify all pass**

```bash
npm test -- --run src/auth/__tests__/getAccessToken.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/auth/getAccessToken.ts src/auth/__tests__/getAccessToken.test.ts
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "feat(auth): add getAccessToken accessor decoupling axios from React state"
```

## Task 1.6: Create `devLogin.ts`

**Files:**
- Create: `src/auth/devLogin.ts`
- Create: `src/auth/__tests__/devLogin.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/auth/__tests__/devLogin.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setDevClaims,
  getDevClaims,
  clearDevClaims,
  serializeDevClaims,
  DEV_CLAIMS_EVENT,
  type DevClaims,
} from '@/auth/devLogin';

describe('devLogin', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  const sample: DevClaims = {
    userId: 1,
    organizationId: 2,
    roles: ['system_admin'],
    permissions: ['platform:dashboard'],
  };

  it('setDevClaims writes to sessionStorage', () => {
    setDevClaims(sample);
    const stored = sessionStorage.getItem('cps_dev_claims');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual(sample);
  });

  it('setDevClaims dispatches cps:dev-claims-changed event with the claims', () => {
    const handler = vi.fn();
    window.addEventListener(DEV_CLAIMS_EVENT, handler);
    setDevClaims(sample);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual(sample);
    window.removeEventListener(DEV_CLAIMS_EVENT, handler);
  });

  it('getDevClaims returns parsed claims when set', () => {
    setDevClaims(sample);
    expect(getDevClaims()).toEqual(sample);
  });

  it('getDevClaims returns null when nothing is stored', () => {
    expect(getDevClaims()).toBeNull();
  });

  it('getDevClaims returns null and does not throw on malformed JSON', () => {
    sessionStorage.setItem('cps_dev_claims', '{not json}');
    expect(getDevClaims()).toBeNull();
  });

  it('clearDevClaims removes the sessionStorage entry', () => {
    setDevClaims(sample);
    clearDevClaims();
    expect(sessionStorage.getItem('cps_dev_claims')).toBeNull();
  });

  it('clearDevClaims dispatches cps:dev-claims-changed with null', () => {
    setDevClaims(sample);
    const handler = vi.fn();
    window.addEventListener(DEV_CLAIMS_EVENT, handler);
    clearDevClaims();
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toBeNull();
    window.removeEventListener(DEV_CLAIMS_EVENT, handler);
  });

  it('serializeDevClaims produces backend X-Dev-Claims format', () => {
    expect(serializeDevClaims(sample)).toBe(
      'userId=1;organizationId=2;rbac_role=system_admin;permission=platform:dashboard'
    );
  });

  it('serializeDevClaims handles multiple roles and permissions', () => {
    expect(
      serializeDevClaims({
        userId: 1,
        organizationId: 2,
        roles: ['system_admin', 'billing_admin'],
        permissions: ['p1', 'p2'],
      })
    ).toBe(
      'userId=1;organizationId=2;rbac_role=system_admin;rbac_role=billing_admin;permission=p1;permission=p2'
    );
  });

  it('serializeDevClaims omits organizationId when undefined', () => {
    expect(
      serializeDevClaims({
        userId: 1,
        roles: ['clinician'],
        permissions: [],
      })
    ).toBe('userId=1;rbac_role=clinician');
  });
});
```

- [ ] **Step 2: Run the tests, verify all fail**

```bash
npm test -- --run src/auth/__tests__/devLogin.test.ts
```

Expected: 10 tests FAIL.

- [ ] **Step 3: Implement `devLogin.ts`**

Create `src/auth/devLogin.ts`:

```ts
/**
 * Dev-only identity manager. When the SPA is in dev mode (useDevAuth()),
 * AuthContext reads dev claims from this module and apiClient sends them
 * as the X-Dev-Claims header on every request. The backend's
 * DevBypassAuthHandler reads the header to authenticate the request.
 *
 * Production builds tree-shake this module via `import.meta.env.PROD`
 * guards in callers — there's no runtime path in prod that would set
 * or read dev claims.
 */

export interface DevClaims {
  userId: number;
  organizationId?: number;
  roles: string[];
  permissions: string[];
}

const STORAGE_KEY = 'cps_dev_claims';
export const DEV_CLAIMS_EVENT = 'cps:dev-claims-changed';

export function setDevClaims(claims: DevClaims): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  dispatch(claims);
}

export function getDevClaims(): DevClaims | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DevClaims;
  } catch {
    return null;
  }
}

export function clearDevClaims(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  dispatch(null);
}

/**
 * Serialize DevClaims into the wire format DevBypassAuthHandler expects.
 * Matches the parser at cps-dotnet/src/CPS.Api/Authentication/DevBypassAuthHandler.cs:49-56:
 *
 *     userId=1;organizationId=2;rbac_role=system_admin;permission=platform:dashboard
 *
 * Repeat-keyed entries (rbac_role, permission) are supported by the
 * backend — every claim is added individually.
 */
export function serializeDevClaims(claims: DevClaims): string {
  const parts: string[] = [`userId=${claims.userId}`];
  if (claims.organizationId !== undefined) {
    parts.push(`organizationId=${claims.organizationId}`);
  }
  for (const role of claims.roles) parts.push(`rbac_role=${role}`);
  for (const perm of claims.permissions) parts.push(`permission=${perm}`);
  return parts.join(';');
}

function dispatch(detail: DevClaims | null): void {
  window.dispatchEvent(new CustomEvent(DEV_CLAIMS_EVENT, { detail }));
}
```

- [ ] **Step 4: Run the tests, verify all pass**

```bash
npm test -- --run src/auth/__tests__/devLogin.test.ts
```

Expected: 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/auth/devLogin.ts src/auth/__tests__/devLogin.test.ts
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "feat(auth): add devLogin module driving X-Dev-Claims header"
```

## Task 1.7: Create the fake MSAL test helper

**Files:**
- Create: `src/auth/__tests__/fakes/msal.ts`

This file is test infra used by later tests. No tests for the fake itself.

- [ ] **Step 1: Create `src/auth/__tests__/fakes/msal.ts`**

```ts
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
    setActiveAccount: vi.fn(),
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
```

- [ ] **Step 2: Quick smoke test by importing**

```bash
npm test -- --run src/auth/__tests__/fakes 2>&1 | head -20
```

Expected: No tests found in that path (file exports but no test cases) — no error. If TypeScript errors appear, fix them.

- [ ] **Step 3: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/auth/__tests__/fakes/msal.ts
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "test(auth): add fake PublicClientApplication for unit tests"
```

## Task 1.8: Create `ssoAcquire.ts` with silent-then-redirect fallback

**Files:**
- Create: `src/auth/ssoAcquire.ts`
- Create: `src/auth/__tests__/ssoAcquire.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/auth/__tests__/ssoAcquire.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { acquireBearerToken } from '@/auth/ssoAcquire';
import { createFakePca, fakeAccount, fakeTokenResponse } from './fakes/msal';

describe('acquireBearerToken', () => {
  it('returns the accessToken from acquireTokenSilent on success', async () => {
    const acc = fakeAccount();
    const pca = createFakePca({
      accounts: [acc],
      tokenResponses: [fakeTokenResponse('silent.tok')],
    });
    const result = await acquireBearerToken(pca, acc);
    expect(result).toBe('silent.tok');
    expect(pca.acquireTokenSilent).toHaveBeenCalledOnce();
  });

  it('falls back to acquireTokenRedirect on InteractionRequiredAuthError', async () => {
    const acc = fakeAccount();
    const interactionErr = new InteractionRequiredAuthError(
      'interaction_required',
      'interaction required'
    );
    const pca = createFakePca({
      accounts: [acc],
      tokenResponses: [interactionErr],
    });
    const result = await acquireBearerToken(pca, acc);
    // Redirect navigates the browser; ssoAcquire returns null so caller
    // doesn't try to use a non-existent token.
    expect(result).toBeNull();
    expect(pca.acquireTokenRedirect).toHaveBeenCalledOnce();
  });

  it('propagates other errors (does not fall back to redirect)', async () => {
    const acc = fakeAccount();
    const otherErr = new Error('network failure');
    const pca = createFakePca({
      accounts: [acc],
      tokenResponses: [otherErr],
    });
    await expect(acquireBearerToken(pca, acc)).rejects.toThrow('network failure');
    expect(pca.acquireTokenRedirect).not.toHaveBeenCalled();
  });

  it('returns null when no account is passed', async () => {
    const pca = createFakePca({});
    const result = await acquireBearerToken(pca, null);
    expect(result).toBeNull();
    expect(pca.acquireTokenSilent).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests, verify all fail**

```bash
npm test -- --run src/auth/__tests__/ssoAcquire.test.ts
```

Expected: 4 tests FAIL.

- [ ] **Step 3: Implement `ssoAcquire.ts`**

Create `src/auth/ssoAcquire.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests, verify all pass**

```bash
npm test -- --run src/auth/__tests__/ssoAcquire.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/auth/ssoAcquire.ts src/auth/__tests__/ssoAcquire.test.ts
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "feat(auth): add acquireBearerToken with silent-then-redirect fallback"
```

## Task 1.9: Rewrite `AuthContext.tsx`

**Files:**
- Modify: `src/auth/AuthContext.tsx` (full rewrite)
- Modify: `src/auth/__tests__/AuthContext.test.tsx` (full rewrite)
- Modify: `src/auth/useAuth.ts`

This is the biggest task in Phase 1. The AuthContext now branches on `useDevAuth()`, removes all password code, and uses the accessor pattern.

- [ ] **Step 1: Write the new failing tests**

Replace the contents of `src/auth/__tests__/AuthContext.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventType } from '@azure/msal-browser';
import { AuthProvider } from '@/auth/AuthContext';
import { useAuth } from '@/auth/useAuth';
import {
  setDevClaims,
  clearDevClaims,
  DEV_CLAIMS_EVENT,
} from '@/auth/devLogin';
import {
  createFakePca,
  fakeAccount,
  fakeTokenResponse,
} from '@/auth/__tests__/fakes/msal';

/** Build a B2C-shaped JWT for tests. */
function makeB2CToken(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

function TestConsumer() {
  const { auth, loginWithSSO, logout } = useAuth();
  return (
    <div>
      <span data-testid="is-auth">{String(auth.isAuthenticated)}</span>
      <span data-testid="user-id">{auth.user?.userId ?? 'null'}</span>
      <span data-testid="roles">{auth.user?.roles.join(',') ?? ''}</span>
      <button onClick={loginWithSSO}>Login SSO</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext (SSO mode)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes unauthenticated when no MSAL account', () => {
    const pca = createFakePca({ accounts: [] });
    render(
      <AuthProvider pca={pca}>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('false');
  });

  it('hydrates state when MSAL has an account and silent token works', async () => {
    const token = makeB2CToken({
      extension_userId: '42',
      extension_organizationId: '7',
      extension_rbac_role: 'billing_admin',
    });
    const pca = createFakePca({
      accounts: [fakeAccount()],
      tokenResponses: [fakeTokenResponse(token)],
    });
    render(
      <AuthProvider pca={pca}>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('is-auth').textContent).toBe('true');
    });
    expect(screen.getByTestId('user-id').textContent).toBe('42');
    expect(screen.getByTestId('roles').textContent).toBe('billing_admin');
  });

  it('loginWithSSO calls loginRedirect with loginRequest', async () => {
    const pca = createFakePca({ accounts: [] });
    render(
      <AuthProvider pca={pca}>
        <TestConsumer />
      </AuthProvider>
    );
    await act(async () => {
      await userEvent.click(screen.getByText('Login SSO'));
    });
    expect(pca.loginRedirect).toHaveBeenCalledOnce();
    expect((pca.loginRedirect as any).mock.calls[0][0].scopes).toBeDefined();
  });

  it('logout calls logoutRedirect with postLogoutRedirectUri', async () => {
    const token = makeB2CToken({ extension_userId: '1' });
    const pca = createFakePca({
      accounts: [fakeAccount()],
      tokenResponses: [fakeTokenResponse(token)],
    });
    render(
      <AuthProvider pca={pca}>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId('is-auth').textContent).toBe('true')
    );
    await act(async () => {
      await userEvent.click(screen.getByText('Logout'));
    });
    expect(pca.logoutRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ postLogoutRedirectUri: '/login' })
    );
  });

  it('LOGIN_SUCCESS event hydrates state', async () => {
    const token = makeB2CToken({
      extension_userId: '99',
      extension_rbac_role: 'clinician',
    });
    const pca = createFakePca({ accounts: [] });
    render(
      <AuthProvider pca={pca}>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('false');

    // Simulate B2C redirect-callback completion: an account appears and
    // LOGIN_SUCCESS fires.
    (pca.getAllAccounts as any).mockReturnValue([fakeAccount()]);
    // Reset the token queue
    (pca.acquireTokenSilent as any).mockResolvedValueOnce(
      fakeTokenResponse(token)
    );
    await act(async () => {
      (pca as any)._fireEvent({
        eventType: EventType.LOGIN_SUCCESS,
        payload: { account: fakeAccount() },
      });
    });
    await waitFor(() =>
      expect(screen.getByTestId('is-auth').textContent).toBe('true')
    );
    expect(screen.getByTestId('user-id').textContent).toBe('99');
  });
});

describe('AuthContext (dev mode)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes unauthenticated when no dev claims set', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('false');
  });

  it('hydrates from dev claims on cold boot', () => {
    setDevClaims({
      userId: 7,
      organizationId: 1,
      roles: ['system_admin'],
      permissions: [],
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('true');
    expect(screen.getByTestId('user-id').textContent).toBe('7');
    expect(screen.getByTestId('roles').textContent).toBe('system_admin');
  });

  it('cps:dev-claims-changed event re-syncs auth state mid-session', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('is-auth').textContent).toBe('false');

    await act(async () => {
      setDevClaims({
        userId: 3,
        organizationId: 2,
        roles: ['clinician'],
        permissions: [],
      });
    });
    await waitFor(() =>
      expect(screen.getByTestId('is-auth').textContent).toBe('true')
    );
    expect(screen.getByTestId('user-id').textContent).toBe('3');

    // clearDevClaims fires the event with detail=null
    await act(async () => {
      clearDevClaims();
    });
    await waitFor(() =>
      expect(screen.getByTestId('is-auth').textContent).toBe('false')
    );
  });

  it('logout in dev mode clears dev claims and resets state', async () => {
    setDevClaims({
      userId: 1,
      organizationId: 1,
      roles: ['system_admin'],
      permissions: [],
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await act(async () => {
      await userEvent.click(screen.getByText('Logout'));
    });
    expect(sessionStorage.getItem('cps_dev_claims')).toBeNull();
    expect(screen.getByTestId('is-auth').textContent).toBe('false');
  });
});
```

- [ ] **Step 2: Run tests, verify all fail**

```bash
npm test -- --run src/auth/__tests__/AuthContext.test.tsx
```

Expected: All tests FAIL — the AuthContext doesn't accept a `pca` prop yet, doesn't expose `loginWithSSO`, etc.

- [ ] **Step 3: Rewrite `AuthContext.tsx`**

Replace the contents of `src/auth/AuthContext.tsx`:

```tsx
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
import { getMsalInstance, isB2CConfigured, loginRequest, useDevAuth } from './msalConfig';
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
```

Also update `src/auth/useAuth.ts`:

```ts
import { useContext } from 'react';
import { AuthContext } from './AuthContext';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
```

(The hook signature is the same shape; the destructured fields change because `AuthContextValue` now exposes `loginWithSSO` instead of `login`.)

- [ ] **Step 4: Run AuthContext tests, verify all pass**

```bash
npm test -- --run src/auth/__tests__/AuthContext.test.tsx
```

Expected: 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/auth/AuthContext.tsx src/auth/useAuth.ts src/auth/__tests__/AuthContext.test.tsx
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "feat(auth): rewrite AuthContext with B2C + dev-claims branches"
```

## Task 1.10: Update `apiClient` to use accessor + X-Dev-Claims

**Files:**
- Modify: `src/api/client.ts`
- Modify: `src/api/__tests__/client.test.ts`

- [ ] **Step 1: Rewrite the apiClient tests**

Replace `src/api/__tests__/client.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setAccessTokenProvider,
  _resetAccessTokenProviderForTests,
} from '@/auth/getAccessToken';
import { setDevClaims, clearDevClaims } from '@/auth/devLogin';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { default: actual.default };
});

function makeHeaders(): Record<string, string> & { set(name: string, value: string): void } {
  const store: Record<string, string> = {};
  const obj = {
    ...store,
    set(name: string, value: string) {
      (obj as unknown as Record<string, string>)[name] = value;
    },
  };
  return obj as unknown as Record<string, string> & { set(name: string, value: string): void };
}

describe('apiClient interceptors', () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
    sessionStorage.clear();
    _resetAccessTokenProviderForTests();
    vi.resetModules();
    // Default: SSO mode for these tests unless overridden
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('attaches Bearer token from getAccessToken in SSO mode', async () => {
    setAccessTokenProvider(() => 'b2c.access.tok');
    const { apiClient } = await import('@/api/client');
    const interceptors = (apiClient.interceptors.request as any).handlers;
    const mockConfig = { headers: makeHeaders() };
    const result = await interceptors[0].fulfilled(mockConfig);
    expect(result.headers['Authorization']).toBe('Bearer b2c.access.tok');
    expect(result.headers['X-Dev-Claims']).toBeUndefined();
  });

  it('does not attach Authorization header when getAccessToken returns null', async () => {
    setAccessTokenProvider(() => null);
    const { apiClient } = await import('@/api/client');
    const interceptors = (apiClient.interceptors.request as any).handlers;
    const mockConfig = { headers: makeHeaders() };
    const result = await interceptors[0].fulfilled(mockConfig);
    expect(result.headers['Authorization']).toBeUndefined();
  });

  it('sets X-Dev-Claims and omits Authorization in dev mode', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    setDevClaims({
      userId: 5,
      organizationId: 1,
      roles: ['billing_admin'],
      permissions: ['claims:view'],
    });
    const { apiClient } = await import('@/api/client');
    const interceptors = (apiClient.interceptors.request as any).handlers;
    const mockConfig = { headers: makeHeaders() };
    const result = await interceptors[0].fulfilled(mockConfig);
    expect(result.headers['X-Dev-Claims']).toBe(
      'userId=5;organizationId=1;rbac_role=billing_admin;permission=claims:view'
    );
    expect(result.headers['Authorization']).toBeUndefined();
  });

  it('dev mode with no dev claims set: no headers added', async () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    clearDevClaims();
    const { apiClient } = await import('@/api/client');
    const interceptors = (apiClient.interceptors.request as any).handlers;
    const mockConfig = { headers: makeHeaders() };
    const result = await interceptors[0].fulfilled(mockConfig);
    expect(result.headers['Authorization']).toBeUndefined();
    expect(result.headers['X-Dev-Claims']).toBeUndefined();
  });

  it('on 401 response redirects to /login?reason=expired', async () => {
    setAccessTokenProvider(() => 'some.tok');
    const { apiClient } = await import('@/api/client');
    const responseInterceptors = (apiClient.interceptors.response as any).handlers;
    const err = { response: { status: 401 } };
    try {
      await responseInterceptors[0].rejected(err);
    } catch {
      // expected to reject
    }
    expect(window.location.href).toBe('/login?reason=expired');
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
npm test -- --run src/api/__tests__/client.test.ts
```

Expected: 5 tests FAIL.

- [ ] **Step 3: Rewrite `src/api/client.ts`**

```ts
import axios from 'axios';
import { useDevAuth } from '@/auth/msalConfig';
import { getAccessToken } from '@/auth/getAccessToken';
import { getDevClaims, serializeDevClaims } from '@/auth/devLogin';

export const apiClient = axios.create({
  baseURL: '/api/v2',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  if (useDevAuth()) {
    const claims = getDevClaims();
    if (claims) {
      config.headers.set('X-Dev-Claims', serializeDevClaims(claims));
    }
  } else {
    const token = await getAccessToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (err: unknown) => {
    if (
      typeof err === 'object' &&
      err !== null &&
      'response' in err &&
      (err as { response?: { status?: number } }).response?.status === 401
    ) {
      window.location.href = '/login?reason=expired';
    }
    return Promise.reject(err);
  }
);
```

- [ ] **Step 4: Run the tests, verify all pass**

```bash
npm test -- --run src/api/__tests__/client.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/api/client.ts src/api/__tests__/client.test.ts
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "feat(api): apiClient uses getAccessToken + X-Dev-Claims via useDevAuth()"
```

## Task 1.11: Update `App.test.tsx` for new auth setup

**Files:**
- Modify: `src/__tests__/App.test.tsx`

The existing role-routing tests set `sessionStorage['cps_token']` directly. Switch them to use `setDevClaims` (dev mode for tests).

- [ ] **Step 1: Read the current `App.test.tsx`**

```bash
cat C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa/src/__tests__/App.test.tsx
```

- [ ] **Step 2: Replace `sessionStorage.setItem('cps_token', ...)` setup with dev-claims**

For every block like:

```ts
sessionStorage.setItem('cps_token', makeToken({ userId: 1, organizationId: 5, rbac_role: 'billing_admin' }));
```

Replace with:

```ts
setDevClaims({ userId: 1, organizationId: 5, roles: ['billing_admin'], permissions: [] });
```

Add at the top of the test file:

```ts
import { setDevClaims, clearDevClaims } from '@/auth/devLogin';

beforeEach(() => {
  (import.meta.env as any).VITE_B2C_CLIENT_ID = '';  // dev mode
  (import.meta.env as any).VITE_DEV_LOGIN = 'false';
  clearDevClaims();
});

afterEach(() => {
  clearDevClaims();
});
```

Remove the `makeToken` helper if no other test uses it. Remove `sessionStorage` cleanup calls related to `cps_token`.

- [ ] **Step 3: Run App.test.tsx, verify all pass**

```bash
npm test -- --run src/__tests__/App.test.tsx
```

Expected: All existing role-routing tests PASS.

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/__tests__/App.test.tsx
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "test(spa): App role-routing tests use setDevClaims instead of cps_token"
```

## Task 1.12: Run the full test suite + typecheck

- [ ] **Step 1: Run the full suite**

```bash
cd C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa
npm test
```

Expected: ALL tests PASS. If any test that wasn't touched in this phase fails, investigate — it's likely importing something from `@/auth/` that changed signature.

- [ ] **Step 2: Run TypeScript check**

```bash
npm run build
```

Expected: `tsc` passes + Vite build succeeds. If TypeScript errors appear in files we didn't touch (e.g., a page that imported the old `login` from `useAuth`), that's a real bug — those callers need updating. Likeliest culprit is the existing `Login.tsx` page. We'll rewrite it in Phase 2; for now just make it compile (e.g., temporarily inline a dummy `loginWithPassword = async () => {}` if needed) so this PR can land.

If `Login.tsx` needs a compile fix:

```tsx
// Temporary stub — replaced by full rewrite in Phase 2.
const loginWithPassword = async (_email: string, _password: string) => {
  throw new Error('Local password login removed; use SSO');
};
```

- [ ] **Step 3: Commit any compile fixes**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa status --short
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add -A
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "fix(spa): stub loginWithPassword for compile (replaced in Phase 2)" || echo "no fixes needed"
```

## Task 1.13: Push branch + open PR

- [ ] **Step 1: Push**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa push -u origin feature/auth-msal-scaffolding
```

Expected: branch published.

- [ ] **Step 2: Open the PR**

```bash
gh pr create --repo VijayYadav-arch/cps-spa --base main --head feature/auth-msal-scaffolding --title "feat(auth): MSAL scaffolding (Phase 1 of MSAL-only cutover)" --body "$(cat <<'EOF'
## Summary

Phase 1 of the MSAL-only cutover ([spec](./docs/superpowers/specs/2026-05-26-cps-spa-msal-only-design.md)). Adds the MSAL + dev-claims plumbing without changing any user-visible UI. Login page still renders the existing dead form; Phase 2 swaps it for the SsoButton / DevLoginForm.

**Behavior preserved:** local dev workflow via `Auth:DevBypass:Enabled=true` keeps working because apiClient drops the Authorization header in dev mode (DevBypass picks up requests by config or X-Dev-Claims regardless).

## What's in

- `@azure/msal-browser` + `@azure/msal-react` added
- New `src/auth/` modules: `msalConfig` (with `isB2CConfigured()` + `useDevAuth()` predicates), `claims`, `errors`, `getAccessToken`, `devLogin`, `ssoAcquire`, test fake PCA
- `AuthContext` rewritten — wraps `MsalProvider`, branches on `useDevAuth()`, exposes `loginWithSSO()` instead of `login(email, password)`
- `apiClient` request interceptor branches on `useDevAuth()`: SSO mode sends Bearer; dev mode sends `X-Dev-Claims`
- 401 redirects to `/login?reason=expired`
- All existing tests pass; new tests cover both modes

## Test plan

- [ ] `npm test` — full suite passes
- [ ] `npm run build` — TypeScript + Vite build succeeds
- [ ] Manual smoke: backend with `Auth:DevBypass:Enabled=true`, run `npm run dev`, open `/` — should still load using existing Login form (this PR doesn't change the UI yet)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed. Note the PR number for tracking.

---

# Phase 2: cps-spa Login UI Rewrite

**PR scope:** Replace the dead email/password form with `SsoButton` (prod) + `DevLoginForm` (dev). Requires Phase 1 merged.

**Branch:** `feature/auth-login-ui` off `cps-spa/main` (after Phase 1 merges).

## Task 2.0: Create the feature branch

- [ ] **Step 1: Verify Phase 1 is merged**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa fetch origin
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa log origin/main --oneline -5
```

Expected: see commit `feat(auth): MSAL scaffolding (...)` (the squashed-merge of Phase 1).

- [ ] **Step 2: Create the branch**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa checkout main
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa pull --ff-only origin main
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa checkout -b feature/auth-login-ui
```

## Task 2.1: Create `SsoButton.tsx`

**Files:**
- Create: `src/auth/SsoButton.tsx`
- Create: `src/auth/__tests__/SsoButton.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/auth/__tests__/SsoButton.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SsoButton } from '@/auth/SsoButton';
import { AuthContext } from '@/auth/AuthContext';

function renderWithAuth(loginWithSSO = vi.fn()) {
  return render(
    <AuthContext.Provider
      value={{
        auth: { isAuthenticated: false, user: null },
        loginWithSSO,
        logout: vi.fn(),
      }}
    >
      <SsoButton />
    </AuthContext.Provider>
  );
}

describe('SsoButton', () => {
  beforeEach(() => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the SSO button when useDevAuth() is false', () => {
    renderWithAuth();
    expect(screen.getByRole('button', { name: /sign in with company sso/i })).toBeInTheDocument();
  });

  it('clicking the button calls loginWithSSO', async () => {
    const loginWithSSO = vi.fn();
    renderWithAuth(loginWithSSO);
    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });
    expect(loginWithSSO).toHaveBeenCalledOnce();
  });

  it('is disabled with tooltip when useDevAuth() is true', () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    renderWithAuth();
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.getAttribute('title')).toMatch(/b2c not configured/i);
  });
});
```

- [ ] **Step 2: Run tests, verify all fail**

```bash
npm test -- --run src/auth/__tests__/SsoButton.test.tsx
```

Expected: 3 tests FAIL.

- [ ] **Step 3: Implement `SsoButton.tsx`**

```tsx
import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import { useDevAuth } from './msalConfig';

export function SsoButton() {
  const { loginWithSSO } = useContext(AuthContext);
  const disabled = useDevAuth();
  return (
    <button
      type="button"
      onClick={() => void loginWithSSO()}
      disabled={disabled}
      title={
        disabled ? 'B2C not configured in this environment' : 'Sign in with company SSO'
      }
      className="sso-button"
    >
      Sign in with company SSO
    </button>
  );
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
npm test -- --run src/auth/__tests__/SsoButton.test.tsx
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/auth/SsoButton.tsx src/auth/__tests__/SsoButton.test.tsx
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "feat(auth): add SsoButton component"
```

## Task 2.2: Create `DevLoginForm.tsx`

**Files:**
- Create: `src/auth/DevLoginForm.tsx`
- Create: `src/auth/__tests__/DevLoginForm.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/auth/__tests__/DevLoginForm.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DevLoginForm } from '@/auth/DevLoginForm';
import { setDevClaims, clearDevClaims, getDevClaims } from '@/auth/devLogin';

describe('DevLoginForm', () => {
  beforeEach(() => {
    sessionStorage.clear();
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders nothing when useDevAuth() is false (B2C configured, override off)', () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    const { container } = render(<DevLoginForm />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the form when useDevAuth() is true', () => {
    render(<DevLoginForm />);
    expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/organization id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/roles/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/permissions/i)).toBeInTheDocument();
  });

  it('submit calls setDevClaims with parsed values', async () => {
    render(<DevLoginForm />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(/user id/i));
    await user.type(screen.getByLabelText(/user id/i), '7');
    await user.clear(screen.getByLabelText(/organization id/i));
    await user.type(screen.getByLabelText(/organization id/i), '2');
    await user.clear(screen.getByLabelText(/roles/i));
    await user.type(screen.getByLabelText(/roles/i), 'system_admin, billing_admin');
    await user.clear(screen.getByLabelText(/permissions/i));
    await user.type(screen.getByLabelText(/permissions/i), 'platform:dashboard');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sign in as dev/i }));
    });

    expect(getDevClaims()).toEqual({
      userId: 7,
      organizationId: 2,
      roles: ['system_admin', 'billing_admin'],
      permissions: ['platform:dashboard'],
    });
  });

  it('shows inline error when userId is negative', async () => {
    render(<DevLoginForm />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(/user id/i));
    await user.type(screen.getByLabelText(/user id/i), '-1');
    await user.clear(screen.getByLabelText(/roles/i));
    await user.type(screen.getByLabelText(/roles/i), 'clinician');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sign in as dev/i }));
    });

    expect(screen.getByText(/user id must be a positive integer/i)).toBeInTheDocument();
    expect(getDevClaims()).toBeNull();
  });

  it('shows inline error when roles list is empty', async () => {
    render(<DevLoginForm />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(/user id/i));
    await user.type(screen.getByLabelText(/user id/i), '1');
    await user.clear(screen.getByLabelText(/roles/i));
    // intentionally leave empty

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /sign in as dev/i }));
    });

    expect(screen.getByText(/at least one role is required/i)).toBeInTheDocument();
    expect(getDevClaims()).toBeNull();
  });

  it('populates fields from prior session dev claims', () => {
    setDevClaims({
      userId: 99,
      organizationId: 3,
      roles: ['clinician'],
      permissions: ['visit:create'],
    });
    render(<DevLoginForm />);
    expect((screen.getByLabelText(/user id/i) as HTMLInputElement).value).toBe('99');
    expect((screen.getByLabelText(/organization id/i) as HTMLInputElement).value).toBe('3');
    expect((screen.getByLabelText(/roles/i) as HTMLInputElement).value).toBe('clinician');
    expect((screen.getByLabelText(/permissions/i) as HTMLInputElement).value).toBe('visit:create');
  });
});
```

- [ ] **Step 2: Run tests, verify all fail**

```bash
npm test -- --run src/auth/__tests__/DevLoginForm.test.tsx
```

Expected: 6 tests FAIL.

- [ ] **Step 3: Implement `DevLoginForm.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useDevAuth } from './msalConfig';
import { setDevClaims, getDevClaims } from './devLogin';
import { DevClaimsValidationError } from './errors';

export function DevLoginForm() {
  if (!useDevAuth()) return null;

  const initial = getDevClaims();
  const [userId, setUserId] = useState(String(initial?.userId ?? '1'));
  const [orgId, setOrgId] = useState(String(initial?.organizationId ?? '1'));
  const [roles, setRoles] = useState((initial?.roles ?? ['system_admin']).join(', '));
  const [perms, setPerms] = useState((initial?.permissions ?? []).join(', '));
  const [error, setError] = useState<DevClaimsValidationError | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const parsedUserId = Number(userId);
      if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
        throw new DevClaimsValidationError('userId', 'must be a positive integer');
      }
      const parsedOrgId = orgId.trim() === '' ? undefined : Number(orgId);
      if (parsedOrgId !== undefined && (!Number.isInteger(parsedOrgId) || parsedOrgId <= 0)) {
        throw new DevClaimsValidationError('organizationId', 'must be a positive integer or empty');
      }
      const parsedRoles = roles.split(',').map((s) => s.trim()).filter(Boolean);
      if (parsedRoles.length === 0) {
        throw new DevClaimsValidationError('roles', 'at least one role is required');
      }
      const parsedPerms = perms.split(',').map((s) => s.trim()).filter(Boolean);

      setError(null);
      setDevClaims({
        userId: parsedUserId,
        organizationId: parsedOrgId,
        roles: parsedRoles,
        permissions: parsedPerms,
      });
    } catch (err) {
      if (err instanceof DevClaimsValidationError) setError(err);
      else throw err;
    }
  };

  return (
    <form onSubmit={onSubmit} className="dev-login-form" aria-label="Dev login form">
      <h2>Dev Identity Picker</h2>
      <p className="dev-warning">Dev mode: B2C is not active in this environment.</p>

      <label htmlFor="dev-userid">User ID</label>
      <input
        id="dev-userid"
        type="number"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        min={1}
      />
      {error?.field === 'userId' && (
        <span className="field-error" role="alert">User ID must be a positive integer</span>
      )}

      <label htmlFor="dev-orgid">Organization ID</label>
      <input
        id="dev-orgid"
        type="number"
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
      />
      {error?.field === 'organizationId' && (
        <span className="field-error" role="alert">Organization ID must be a positive integer</span>
      )}

      <label htmlFor="dev-roles">Roles (comma-separated)</label>
      <input
        id="dev-roles"
        type="text"
        value={roles}
        onChange={(e) => setRoles(e.target.value)}
        placeholder="system_admin, billing_admin"
      />
      {error?.field === 'roles' && (
        <span className="field-error" role="alert">At least one role is required</span>
      )}

      <label htmlFor="dev-perms">Permissions (comma-separated)</label>
      <input
        id="dev-perms"
        type="text"
        value={perms}
        onChange={(e) => setPerms(e.target.value)}
        placeholder="platform:dashboard, claims:view"
      />

      <button type="submit">Sign in as dev</button>
    </form>
  );
}
```

- [ ] **Step 4: Run tests, verify all pass**

```bash
npm test -- --run src/auth/__tests__/DevLoginForm.test.tsx
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/auth/DevLoginForm.tsx src/auth/__tests__/DevLoginForm.test.tsx
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "feat(auth): add DevLoginForm for local identity picking"
```

## Task 2.3: Rewrite `Login.tsx`

**Files:**
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/__tests__/Login.test.tsx`

- [ ] **Step 1: Read the current `Login.tsx`** (to understand what styles/wrappers to preserve)

```bash
cat C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa/src/pages/Login.tsx
```

- [ ] **Step 2: Rewrite the Login test**

Replace `src/pages/__tests__/Login.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '@/pages/Login';
import { AuthContext } from '@/auth/AuthContext';

function renderLogin(initialEntries = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider
        value={{
          auth: { isAuthenticated: false, user: null },
          loginWithSSO: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <Login />
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('Login page', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders SsoButton in SSO mode', () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in with company sso/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/user id/i)).not.toBeInTheDocument();
  });

  it('renders DevLoginForm in dev mode', () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = '';
    (import.meta.env as any).VITE_DEV_LOGIN = 'false';
    renderLogin();
    expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in with company sso/i })).not.toBeInTheDocument();
  });

  it('shows expired-session banner on ?reason=expired', () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    renderLogin(['/login?reason=expired']);
    expect(screen.getByText(/your session ended/i)).toBeInTheDocument();
  });

  it('shows invalid-token banner on ?reason=invalid_token', () => {
    (import.meta.env as any).VITE_B2C_CLIENT_ID = 'abc-123';
    renderLogin(['/login?reason=invalid_token']);
    expect(screen.getByText(/sign-in could not be completed/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```bash
npm test -- --run src/pages/__tests__/Login.test.tsx
```

Expected: tests FAIL.

- [ ] **Step 4: Rewrite `Login.tsx`**

```tsx
import { useSearchParams } from 'react-router-dom';
import { SsoButton } from '@/auth/SsoButton';
import { DevLoginForm } from '@/auth/DevLoginForm';
import { useDevAuth } from '@/auth/msalConfig';

export function Login() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const devMode = useDevAuth();

  return (
    <div className="login-page">
      <header>
        <h1>CPS</h1>
        <p>Care Practice Suite</p>
      </header>

      {reason === 'expired' && (
        <div role="alert" className="login-banner login-banner--info">
          Your session ended. Please sign in again.
        </div>
      )}

      {reason === 'invalid_token' && (
        <div role="alert" className="login-banner login-banner--warning">
          Sign-in could not be completed. Contact your administrator if this persists.
        </div>
      )}

      {devMode ? <DevLoginForm /> : <SsoButton />}
    </div>
  );
}
```

If `Login.tsx` is exported as a default export anywhere else in the codebase, keep the default export too: `export default Login;` at the bottom.

- [ ] **Step 5: Run Login tests, verify all pass**

```bash
npm test -- --run src/pages/__tests__/Login.test.tsx
```

Expected: 4 tests PASS.

- [ ] **Step 6: Run the full test suite**

```bash
npm test
```

Expected: ALL tests PASS.

- [ ] **Step 7: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add src/pages/Login.tsx src/pages/__tests__/Login.test.tsx
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "feat(auth): rewrite Login page with SsoButton + DevLoginForm"
```

## Task 2.4: Update `.env.example`

**Files:**
- Modify: `.env.example` (create if missing)

- [ ] **Step 1: Check if `.env.example` exists**

```bash
ls C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa/.env.example 2>&1
```

If it doesn't exist, create it. If it does, append the new vars without disturbing existing ones.

- [ ] **Step 2: Add the seven env vars**

Append to `cps-spa/.env.example` (or create it with) this content:

```text
# Azure AD B2C — production SSO config. Empty values = dev mode (DevLoginForm
# rendered, X-Dev-Claims used against DevBypassAuthHandler).
VITE_B2C_CLIENT_ID=
VITE_B2C_INSTANCE=https://contoso.b2clogin.com/tfp
VITE_B2C_DOMAIN=contoso.onmicrosoft.com
VITE_B2C_SUSI_POLICY=B2C_1A_signup_signin
VITE_B2C_REDIRECT_URI=/auth/callback
VITE_B2C_API_SCOPE=https://contoso.onmicrosoft.com/cps-api/access_as_user

# 'true' to force dev mode UI even when B2C is configured (QA / staging
# scenarios). Production deployments MUST set this to 'false' so the
# override can never accidentally activate.
VITE_DEV_LOGIN=false
```

- [ ] **Step 3: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa add .env.example
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa commit -m "docs(auth): document VITE_B2C_* and VITE_DEV_LOGIN env vars in .env.example"
```

## Task 2.5: Push branch + open PR

- [ ] **Step 1: Push**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-spa push -u origin feature/auth-login-ui
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --repo VijayYadav-arch/cps-spa --base main --head feature/auth-login-ui --title "feat(auth): Login UI rewrite — SsoButton + DevLoginForm (Phase 2 of MSAL-only cutover)" --body "$(cat <<'EOF'
## Summary

Phase 2 of the MSAL-only cutover ([spec](./docs/superpowers/specs/2026-05-26-cps-spa-msal-only-design.md)). Replaces the dead email/password form on `/login` with two co-existing surfaces gated by `useDevAuth()`:

- **SSO mode** (`VITE_B2C_CLIENT_ID` set, `VITE_DEV_LOGIN` not set to `true`): renders `SsoButton`. One click triggers MSAL `loginRedirect`.
- **Dev mode** (`VITE_B2C_CLIENT_ID` empty OR `VITE_DEV_LOGIN=true`): renders `DevLoginForm`. Pick `userId / orgId / roles / permissions`, submit → sets `X-Dev-Claims` header on apiClient + synthesizes AuthContext state.

Adds `?reason=expired` and `?reason=invalid_token` banners on the Login page.

## What's in

- `src/auth/SsoButton.tsx` + tests
- `src/auth/DevLoginForm.tsx` + tests
- `src/pages/Login.tsx` rewrite + updated tests
- `.env.example` with the seven `VITE_*` vars documented

## Test plan

- [ ] `npm test` — full suite passes (~25 new tests + existing ones)
- [ ] `npm run build` — TypeScript + Vite build succeeds
- [ ] Manual smoke (dev mode): backend with `Auth:DevBypass:Enabled=true`, `npm run dev`, navigate to `/login` → see DevLoginForm → fill in `userId=1, orgId=1, roles=system_admin` → submit → app loads → API calls visible in network tab carry `X-Dev-Claims` header
- [ ] Manual smoke (SSO disabled in env but B2C client ID present): set `VITE_DEV_LOGIN=true`, restart dev server, `/login` should still show DevLoginForm

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Phase 3: cps-dotnet B2C Infrastructure

**PR scope:** Bicep + IEF custom policy XML + runbook. No code changes to the .NET app itself. This PR can be opened in parallel with Phase 1/2 since it touches a different repo.

**Branch:** `feature/b2c-infra` off `cps-dotnet/main`.

## Task 3.0: Create the feature branch

- [ ] **Step 1: Verify clean state on cps-dotnet**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet status --short
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet fetch origin
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet log origin/main --oneline -5
```

- [ ] **Step 2: Create branch**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet checkout main
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet pull --ff-only origin main
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet checkout -b feature/b2c-infra
```

- [ ] **Step 3: Create the directory skeleton**

```bash
mkdir -p C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet/infra/b2c/parameters
mkdir -p C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet/infra/b2c/custom-policy-trustframework
ls C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet/infra/b2c/
```

Expected: `parameters/`, `custom-policy-trustframework/`.

## Task 3.1: Create `app-registration-api.bicep`

**Files:**
- Create: `infra/b2c/app-registration-api.bicep`

- [ ] **Step 1: Create the file**

```bicep
@description('Name of the API app registration (e.g., cps-api).')
param apiAppName string

@description('Domain of the B2C tenant (e.g., contoso.onmicrosoft.com).')
param tenantDomain string

@description('Tags applied to the app registration in the directory.')
param tags object = {}

// NOTE: Bicep's first-class app-registration resource lives at
// Microsoft.Graph/applications (preview). If your tenant doesn't yet have
// the Microsoft.Graph extensibility provider enabled, this resource will
// fail with a clear error — uncomment the alternative `az ad app create`
// call in the runbook (step 4) as a manual fallback.

resource apiApp 'Microsoft.Graph/applications@beta' = {
  displayName: apiAppName
  identifierUris: [
    'https://${tenantDomain}/cps-api'
  ]
  api: {
    requestedAccessTokenVersion: 2
    oauth2PermissionScopes: [
      {
        id: guid(apiAppName, 'access_as_user')
        adminConsentDescription: 'Allows the SPA to call the CPS API on behalf of the signed-in user.'
        adminConsentDisplayName: 'Access CPS API as user'
        userConsentDescription: 'Allow the SPA to call the CPS API on your behalf.'
        userConsentDisplayName: 'Access CPS API as you'
        isEnabled: true
        type: 'User'
        value: 'access_as_user'
      }
    ]
  }
  signInAudience: 'AzureADMyOrg'
  tags: [for (key, val) in items(tags): '${key}=${val}']
}

output apiAppId string = apiApp.appId
output apiAppIdUri string = apiApp.identifierUris[0]
output scopeName string = 'access_as_user'
```

- [ ] **Step 2: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet add infra/b2c/app-registration-api.bicep
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet commit -m "feat(infra): B2C API app registration bicep module"
```

## Task 3.2: Create `app-registration-spa.bicep`

**Files:**
- Create: `infra/b2c/app-registration-spa.bicep`

- [ ] **Step 1: Create the file**

```bicep
@description('Name of the SPA app registration (e.g., cps-spa).')
param spaAppName string

@description('Redirect URIs allowed for the SPA (one per environment URL).')
param spaRedirectUris array

@description('App ID URI of the API app this SPA calls.')
param apiAppIdUri string

@description('Scope value exposed by the API (e.g., access_as_user).')
param apiScopeName string

@description('Tags applied to the app registration.')
param tags object = {}

resource spaApp 'Microsoft.Graph/applications@beta' = {
  displayName: spaAppName
  signInAudience: 'AzureADMyOrg'
  spa: {
    redirectUris: spaRedirectUris
  }
  requiredResourceAccess: [
    {
      resourceAppId: 'cps-api-placeholder' // replaced post-deploy via Graph
      resourceAccess: [
        {
          id: guid(apiAppIdUri, apiScopeName)
          type: 'Scope'
        }
      ]
    }
  ]
  tags: [for (key, val) in items(tags): '${key}=${val}']
}

output spaClientId string = spaApp.appId
```

- [ ] **Step 2: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet add infra/b2c/app-registration-spa.bicep
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet commit -m "feat(infra): B2C SPA app registration bicep module"
```

## Task 3.3: Create `api-key-secret.bicep`

**Files:**
- Create: `infra/b2c/api-key-secret.bicep`

- [ ] **Step 1: Create the file**

```bicep
@description('Name of the existing Key Vault that will hold the B2C validation API key.')
param keyVaultName string

@description('Initial value of the X-B2C-Api-Key shared secret. Rotate via az keyvault secret set.')
@secure()
param apiKeyValue string

@description('Days until the secret expires; the rotation runbook step uses this.')
param expirationDays int = 90

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource secret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'CpsValidateApiKey'
  properties: {
    value: apiKeyValue
    attributes: {
      enabled: true
      exp: dateTimeToEpoch(dateTimeAdd(utcNow(), 'P${expirationDays}D'))
    }
    contentType: 'X-B2C-Api-Key shared secret for B2C custom policy → cps-dotnet'
  }
}

output secretUri string = secret.properties.secretUri
```

- [ ] **Step 2: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet add infra/b2c/api-key-secret.bicep
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet commit -m "feat(infra): B2C API key key-vault secret bicep module"
```

## Task 3.4: Create `main.bicep`

**Files:**
- Create: `infra/b2c/main.bicep`

- [ ] **Step 1: Create the file**

```bicep
@description('Tenant GUID of the B2C directory (created manually before this deploy).')
param tenantId string

@description('Environment slug: dev | staging | prod.')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string

@description('B2C tenant domain (e.g., contoso.onmicrosoft.com).')
param tenantDomain string

@description('Display name of the API app registration.')
param apiAppName string = 'cps-api-${environment}'

@description('Display name of the SPA app registration.')
param spaAppName string = 'cps-spa-${environment}'

@description('Allowed redirect URIs for the SPA.')
param spaRedirectUris array

@description('Existing Key Vault holding the B2C validation API key.')
param keyVaultName string

@description('Initial value of the B2C validation API key (rotated post-deploy).')
@secure()
param b2cValidateApiKeyInitialValue string

@description('Base URL of cps-dotnet for this environment (used by IEF policy REST call).')
param cpsApiBaseUrl string

var commonTags = {
  app: 'cps'
  environment: environment
  managedBy: 'bicep'
  module: 'b2c'
}

module apiApp 'app-registration-api.bicep' = {
  name: 'apiAppRegistration'
  params: {
    apiAppName: apiAppName
    tenantDomain: tenantDomain
    tags: commonTags
  }
}

module spaApp 'app-registration-spa.bicep' = {
  name: 'spaAppRegistration'
  params: {
    spaAppName: spaAppName
    spaRedirectUris: spaRedirectUris
    apiAppIdUri: apiApp.outputs.apiAppIdUri
    apiScopeName: apiApp.outputs.scopeName
    tags: commonTags
  }
}

module apiKey 'api-key-secret.bicep' = {
  name: 'b2cValidateApiKeySecret'
  params: {
    keyVaultName: keyVaultName
    apiKeyValue: b2cValidateApiKeyInitialValue
  }
}

output tenantId string = tenantId
output spaClientId string = spaApp.outputs.spaClientId
output apiAppIdUri string = apiApp.outputs.apiAppIdUri
output cpsApiBaseUrl string = cpsApiBaseUrl
output keyVaultSecretUri string = apiKey.outputs.secretUri
```

- [ ] **Step 2: Lint Bicep**

```bash
az bicep build --file C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet/infra/b2c/main.bicep --stdout > NUL 2>&1
echo "Bicep build exit code: $?"
```

Expected: exit code 0. If errors print, fix syntax (commonly: missing param decorators, wrong resource API version).

- [ ] **Step 3: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet add infra/b2c/main.bicep
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet commit -m "feat(infra): B2C main.bicep entry orchestrating app registrations and secret"
```

## Task 3.5: Create per-environment parameter files

**Files:**
- Create: `infra/b2c/parameters/dev.bicepparam`
- Create: `infra/b2c/parameters/staging.bicepparam`
- Create: `infra/b2c/parameters/prod.bicepparam`

- [ ] **Step 1: Create `dev.bicepparam`**

```bicep
using '../main.bicep'

param tenantId = 'REPLACE-WITH-DEV-B2C-TENANT-GUID'
param environment = 'dev'
param tenantDomain = 'cpsdev.onmicrosoft.com'
param spaRedirectUris = [
  'http://localhost:5173/auth/callback'
  'https://cps-spa-dev.azurewebsites.net/auth/callback'
]
param keyVaultName = 'cps-kv-dev'
param b2cValidateApiKeyInitialValue = 'REPLACE-WITH-32-BYTE-RANDOM'
param cpsApiBaseUrl = 'https://cps-dotnet-dev.azurewebsites.net'
```

- [ ] **Step 2: Create `staging.bicepparam`**

```bicep
using '../main.bicep'

param tenantId = 'REPLACE-WITH-STAGING-B2C-TENANT-GUID'
param environment = 'staging'
param tenantDomain = 'cpsstaging.onmicrosoft.com'
param spaRedirectUris = [
  'https://cps-spa-staging.azurewebsites.net/auth/callback'
]
param keyVaultName = 'cps-kv-staging'
param b2cValidateApiKeyInitialValue = 'REPLACE-WITH-32-BYTE-RANDOM'
param cpsApiBaseUrl = 'https://cps-dotnet-staging.azurewebsites.net'
```

- [ ] **Step 3: Create `prod.bicepparam`**

```bicep
using '../main.bicep'

param tenantId = 'REPLACE-WITH-PROD-B2C-TENANT-GUID'
param environment = 'prod'
param tenantDomain = 'cps.onmicrosoft.com'
param spaRedirectUris = [
  'https://app.cps.example/auth/callback'
]
param keyVaultName = 'cps-kv-prod'
param b2cValidateApiKeyInitialValue = 'REPLACE-WITH-32-BYTE-RANDOM'
param cpsApiBaseUrl = 'https://api.cps.example'
```

The `REPLACE-WITH-*` placeholders are deliberate — these values must be hand-filled per environment after the tenant is created (runbook step 1). The Bicep what-if check will warn if they're still placeholders at deploy time, but won't fail (so the param files can be merged before tenant GUIDs exist).

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet add infra/b2c/parameters
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet commit -m "feat(infra): B2C per-env parameter files (dev, staging, prod)"
```

## Task 3.6: Add IEF custom policy XML

**Files:**
- Create: `infra/b2c/custom-policy-trustframework/TrustFrameworkBase.xml`
- Create: `infra/b2c/custom-policy-trustframework/TrustFrameworkExtensions.xml`
- Create: `infra/b2c/custom-policy-trustframework/SignUpOrSignin.xml`

The Base policy is the Microsoft starter pack — download it from the official Azure-Samples repo and commit unchanged. Extensions and SignUpOrSignin are CPS-specific.

- [ ] **Step 1: Download `TrustFrameworkBase.xml` from Microsoft starter pack**

Download from: `https://github.com/azure-ad-b2c/samples/blob/master/policies/custom-policy-starterpack/LocalAccounts/TrustFrameworkBase.xml`

Save unchanged to `infra/b2c/custom-policy-trustframework/TrustFrameworkBase.xml`. (Manual step — Bicep / Bash cannot fetch + verify a third-party XML at scale; treat it as vendored content.)

- [ ] **Step 2: Create `TrustFrameworkExtensions.xml`**

Create `infra/b2c/custom-policy-trustframework/TrustFrameworkExtensions.xml`:

```xml
<?xml version="1.0" encoding="utf-8" ?>
<TrustFrameworkPolicy
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06"
  PolicySchemaVersion="0.3.0.0"
  TenantId="${TenantName}.onmicrosoft.com"
  PolicyId="B2C_1A_TrustFrameworkExtensions"
  PublicPolicyUri="http://${TenantName}.onmicrosoft.com/B2C_1A_TrustFrameworkExtensions">

  <BasePolicy>
    <TenantId>${TenantName}.onmicrosoft.com</TenantId>
    <PolicyId>B2C_1A_TrustFrameworkBase</PolicyId>
  </BasePolicy>

  <BuildingBlocks>
    <ClaimsSchema>
      <ClaimType Id="extension_userId">
        <DisplayName>CPS User ID</DisplayName>
        <DataType>string</DataType>
        <UserHelpText>Internal CPS user identifier.</UserHelpText>
      </ClaimType>
      <ClaimType Id="extension_organizationId">
        <DisplayName>CPS Organization ID</DisplayName>
        <DataType>string</DataType>
      </ClaimType>
      <ClaimType Id="extension_rbac_role">
        <DisplayName>CPS RBAC Roles</DisplayName>
        <DataType>stringCollection</DataType>
      </ClaimType>
      <ClaimType Id="extension_permissions">
        <DisplayName>CPS Permissions</DisplayName>
        <DataType>stringCollection</DataType>
      </ClaimType>
    </ClaimsSchema>
  </BuildingBlocks>

  <ClaimsProviders>
    <ClaimsProvider>
      <DisplayName>REST-CpsValidate</DisplayName>
      <TechnicalProfiles>
        <TechnicalProfile Id="REST-CpsValidate">
          <DisplayName>Enrich token with CPS claims by calling cps-dotnet</DisplayName>
          <Protocol Name="Proprietary" Handler="Web.TPEngine.Providers.RestfulProvider, Web.TPEngine, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null" />
          <Metadata>
            <Item Key="ServiceUrl">${cpsApiBaseUrl}/api/v2/auth/b2c-validate</Item>
            <Item Key="SendClaimsIn">Body</Item>
            <Item Key="AuthenticationType">None</Item>
            <Item Key="AllowInsecureAuthInProduction">false</Item>
          </Metadata>
          <CryptographicKeys>
            <Key Id="CpsValidateApiKey" StorageReferenceId="B2C_1A_CpsValidateApiKey" />
          </CryptographicKeys>
          <InputClaims>
            <InputClaim ClaimTypeReferenceId="email" PartnerClaimType="Email" />
          </InputClaims>
          <OutputClaims>
            <OutputClaim ClaimTypeReferenceId="extension_userId" PartnerClaimType="userId" />
            <OutputClaim ClaimTypeReferenceId="extension_organizationId" PartnerClaimType="organizationId" />
            <OutputClaim ClaimTypeReferenceId="extension_rbac_role" PartnerClaimType="rbacRoles" />
            <OutputClaim ClaimTypeReferenceId="extension_permissions" PartnerClaimType="permissions" />
          </OutputClaims>
          <UseTechnicalProfileForSessionManagement ReferenceId="SM-Noop" />
        </TechnicalProfile>
      </TechnicalProfiles>
    </ClaimsProvider>
  </ClaimsProviders>
</TrustFrameworkPolicy>
```

- [ ] **Step 3: Create `SignUpOrSignin.xml`**

Create `infra/b2c/custom-policy-trustframework/SignUpOrSignin.xml`:

```xml
<?xml version="1.0" encoding="utf-8" ?>
<TrustFrameworkPolicy
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns="http://schemas.microsoft.com/online/cpim/schemas/2013/06"
  PolicySchemaVersion="0.3.0.0"
  TenantId="${TenantName}.onmicrosoft.com"
  PolicyId="B2C_1A_signup_signin"
  PublicPolicyUri="http://${TenantName}.onmicrosoft.com/B2C_1A_signup_signin">

  <BasePolicy>
    <TenantId>${TenantName}.onmicrosoft.com</TenantId>
    <PolicyId>B2C_1A_TrustFrameworkExtensions</PolicyId>
  </BasePolicy>

  <RelyingParty>
    <DefaultUserJourney ReferenceId="SignUpOrSignIn" />
    <UserJourneyBehaviors>
      <SessionExpiryType>Rolling</SessionExpiryType>
      <SessionExpiryInSeconds>86400</SessionExpiryInSeconds>
    </UserJourneyBehaviors>
    <TechnicalProfile Id="PolicyProfile">
      <DisplayName>PolicyProfile</DisplayName>
      <Protocol Name="OpenIdConnect" />
      <OutputClaims>
        <OutputClaim ClaimTypeReferenceId="email" />
        <OutputClaim ClaimTypeReferenceId="extension_userId" />
        <OutputClaim ClaimTypeReferenceId="extension_organizationId" />
        <OutputClaim ClaimTypeReferenceId="extension_rbac_role" />
        <OutputClaim ClaimTypeReferenceId="extension_permissions" />
      </OutputClaims>
      <SubjectNamingInfo ClaimType="extension_userId" />
    </TechnicalProfile>
  </RelyingParty>
</TrustFrameworkPolicy>
```

- [ ] **Step 4: Lint the XML files**

```bash
xmllint --noout C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet/infra/b2c/custom-policy-trustframework/*.xml
echo "xmllint exit code: $?"
```

Expected: exit code 0 for all three. If `xmllint` is not installed locally, the CI job set up in Task 3.8 will catch syntax errors.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet add infra/b2c/custom-policy-trustframework/
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet commit -m "feat(infra): B2C IEF custom policy XML (Base + Extensions + SignUpOrSignin)"
```

## Task 3.7: Create `replace-placeholders.ps1`

**Files:**
- Create: `infra/b2c/replace-placeholders.ps1`

- [ ] **Step 1: Create the file**

```powershell
<#
.SYNOPSIS
  Substitutes ${TenantName} and ${cpsApiBaseUrl} placeholders in IEF custom
  policy XMLs and writes the resolved files to ./out/<env>/.

.PARAMETER Env
  Environment slug: dev | staging | prod.

.EXAMPLE
  pwsh ./replace-placeholders.ps1 -Env dev
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Env
)

$ErrorActionPreference = 'Stop'

$paramFile = Join-Path $PSScriptRoot "parameters/$Env.bicepparam"
if (-not (Test-Path $paramFile)) {
    throw "Parameter file not found: $paramFile"
}

# Naive parse of .bicepparam — pull tenantDomain and cpsApiBaseUrl literals.
$lines = Get-Content $paramFile
$tenantDomain = ($lines | Where-Object { $_ -match "^param tenantDomain = '(.+)'" }) `
    -replace "^param tenantDomain = '(.+)'", '$1'
$cpsApiBaseUrl = ($lines | Where-Object { $_ -match "^param cpsApiBaseUrl = '(.+)'" }) `
    -replace "^param cpsApiBaseUrl = '(.+)'", '$1'

$tenantName = ($tenantDomain -split '\.')[0]

Write-Host "Substituting for env '$Env':"
Write-Host "  TenantName    = $tenantName"
Write-Host "  cpsApiBaseUrl = $cpsApiBaseUrl"

$inDir = Join-Path $PSScriptRoot 'custom-policy-trustframework'
$outDir = Join-Path $PSScriptRoot "out/$Env"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Get-ChildItem -Path $inDir -Filter '*.xml' | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace '\$\{TenantName\}', $tenantName
    $content = $content -replace '\$\{cpsApiBaseUrl\}', $cpsApiBaseUrl
    $outPath = Join-Path $outDir $_.Name
    Set-Content -Path $outPath -Value $content -Encoding utf8
    Write-Host "  Wrote $outPath"
}

Write-Host "Done. Upload these via Graph (runbook step 7)."
```

- [ ] **Step 2: Smoke-test the script**

```bash
pwsh C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet/infra/b2c/replace-placeholders.ps1 -Env dev
ls C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet/infra/b2c/out/dev/
```

Expected: three files in `out/dev/`. Verify the `${TenantName}` and `${cpsApiBaseUrl}` placeholders in the originals have been substituted in the output files.

- [ ] **Step 3: Add `out/` to .gitignore**

```bash
echo "" >> C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet/infra/b2c/.gitignore
echo "out/" >> C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet/infra/b2c/.gitignore
```

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet add infra/b2c/replace-placeholders.ps1 infra/b2c/.gitignore
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet commit -m "feat(infra): replace-placeholders.ps1 + gitignore generated out/"
```

## Task 3.8: Write the runbook (`README.md`)

**Files:**
- Create: `infra/b2c/README.md`

- [ ] **Step 1: Create the file**

Create `infra/b2c/README.md`:

````markdown
# B2C Infrastructure & Provisioning Runbook

Provisions the Azure AD B2C tenant infrastructure that `cps-spa` (via MSAL) and `cps-dotnet` (via `B2CValidateController` + the default `B2C` JWT scheme) depend on. See [the spec](../../docs/superpowers/specs/2026-05-26-cps-spa-msal-only-design.md) (in the `cps-spa` repo) for design context.

## What this provisions

- **API app registration** — exposes the `cps-api/access_as_user` scope that the SPA requests.
- **SPA app registration** — PKCE-only SPA-type registration for the Vite SPA.
- **Key Vault secret `CpsValidateApiKey`** — shared secret used by the IEF custom policy to authenticate its REST call to `B2CValidateController`. Rotates every 90 days.
- **IEF custom policy chain** — `TrustFrameworkBase` → `TrustFrameworkExtensions` (adds `REST-CpsValidate` technical profile) → `B2C_1A_signup_signin` (user journey).

## What this does NOT provision

These steps are manual and one-time-per-tenant:

- **Creation of the B2C tenant itself** (portal click-through).
- **Linking the tenant to a subscription** (portal).
- **Creating the IEF apps** (`IdentityExperienceFramework`, `ProxyIdentityExperienceFramework`) and policy keys (`TokenSigningKeyContainer`, `TokenEncryptionKeyContainer`).
- **Granting admin consent** on the SPA registration.

Each is called out below at the step where it's required.

---

## Prerequisites

- Azure CLI installed and logged in to the subscription that will own the Key Vault. Bicep deployments target the SUBSCRIPTION'S resource group, while Graph calls target the B2C tenant — the runbook switches contexts between them.
- A Key Vault already provisioned in the target subscription (referenced by `keyVaultName` in the bicepparam file).
- PowerShell 7+ (`pwsh`) on PATH for `replace-placeholders.ps1`.
- Ability to perform portal click-throughs in the B2C tenant.

## Steps

### 1. Create the B2C tenant (portal)

- Azure Portal → Create a resource → Azure Active Directory B2C.
- Pick a tenant name (e.g., `cpsdev`). Domain becomes `cpsdev.onmicrosoft.com`.
- Region: pick closest to user base (US, EU, or Asia Pacific).
- Record the **tenant GUID** and **domain** — both go into `parameters/<env>.bicepparam`.

### 2. Link the tenant to the subscription

- Azure Portal → search "Azure AD B2C" → select the new tenant → Resource type "Microsoft.AzureActiveDirectory/b2cDirectories" → Link to subscription.
- Without this step, the Key Vault secret resource in Bicep cannot reference the tenant.

### 3. Switch to B2C directory context

```bash
az login --tenant <b2c-tenant-guid>
```

Verify the active context:

```bash
az account show --query tenantId -o tsv
```

Expected: matches the GUID from step 1.

### 4. Deploy Bicep app registrations + Key Vault secret

```bash
az group create --name rg-cps-b2c-<env> --location <region>
az deployment group create \
  --resource-group rg-cps-b2c-<env> \
  --template-file main.bicep \
  --parameters parameters/<env>.bicepparam
```

Capture outputs (`spaClientId`, `apiAppIdUri`, `keyVaultSecretUri`):

```bash
az deployment group show \
  --resource-group rg-cps-b2c-<env> \
  --name main \
  --query properties.outputs
```

> **Fallback** if `Microsoft.Graph/applications@beta` fails: create app registrations manually:
> ```bash
> az ad app create --display-name cps-api-<env> --identifier-uris https://<tenant-domain>/cps-api
> az ad app create --display-name cps-spa-<env> --is-fallback-public-client true --spa-redirect-uris ...
> ```
> Patch the bicepparam files to remove the modules and re-run.

### 5. Generate and store `X-B2C-Api-Key`

The bicepparam includes a placeholder initial value. Replace it with a real secret before deploying, OR rotate immediately after:

```bash
openssl rand -base64 32 | az keyvault secret set \
  --vault-name <key-vault-name> \
  --name CpsValidateApiKey \
  --file -
```

Update cps-dotnet `appsettings.<env>.json` (or App Service config) so `B2CValidation:ApiKey` reads from this Key Vault secret. Existing CPS apps use the `@Microsoft.KeyVault(...)` notation pattern.

### 6. Substitute placeholders in custom policy XML

```bash
pwsh ./replace-placeholders.ps1 -Env <env>
ls out/<env>/
```

Expected: three files (`TrustFrameworkBase.xml`, `TrustFrameworkExtensions.xml`, `SignUpOrSignin.xml`) with `${TenantName}` and `${cpsApiBaseUrl}` substituted.

### 7. Upload custom policies via Microsoft Graph

Order matters: Base → Extensions → SignUpOrSignin.

```bash
az rest \
  --method PUT \
  --url 'https://graph.microsoft.com/beta/trustFramework/policies/B2C_1A_TrustFrameworkBase/$value' \
  --headers 'Content-Type=application/xml' \
  --body @out/<env>/TrustFrameworkBase.xml

az rest \
  --method PUT \
  --url 'https://graph.microsoft.com/beta/trustFramework/policies/B2C_1A_TrustFrameworkExtensions/$value' \
  --headers 'Content-Type=application/xml' \
  --body @out/<env>/TrustFrameworkExtensions.xml

az rest \
  --method PUT \
  --url 'https://graph.microsoft.com/beta/trustFramework/policies/B2C_1A_signup_signin/$value' \
  --headers 'Content-Type=application/xml' \
  --body @out/<env>/SignUpOrSignin.xml
```

Each call returns 200 OK on success.

### 8. Add IEF apps and policy keys (portal — one-time per tenant)

Follow Microsoft's "Set up Identity Experience Framework" doc:
<https://learn.microsoft.com/en-us/azure/active-directory-b2c/tutorial-create-user-flows?pivots=b2c-custom-policy#register-identity-experience-framework-applications>

Specifically:

- Register `IdentityExperienceFramework` app (web, signs in users).
- Register `ProxyIdentityExperienceFramework` app (native, gets tokens for IEF).
- Grant admin consent on both.
- Create `TokenSigningKeyContainer` and `TokenEncryptionKeyContainer` policy keys.

### 9. Smoke-test the user journey

- Azure Portal → B2C tenant → Identity Experience Framework → Custom policies → `B2C_1A_signup_signin` → **Run now**.
- Sign in with a test user that exists in the linked `cps-dotnet` database for this environment.
- After successful sign-in, decode the token at `jwt.ms`. Confirm these claims:
  - `extension_userId`
  - `extension_organizationId`
  - `extension_rbac_role`
  - `extension_permissions`

If the claims are missing, the REST call to `B2CValidateController` failed — check:
- `X-B2C-Api-Key` value matches the Key Vault secret
- `cpsApiBaseUrl` reaches the cps-dotnet instance
- The test user is provisioned (has a row in `Users`)

### 10. Plumb env vars into the SPA build

Add these seven to the SPA's deployment pipeline (Vite reads at build time):

```text
VITE_B2C_CLIENT_ID=<spaClientId output from step 4>
VITE_B2C_INSTANCE=https://<tenantName>.b2clogin.com/tfp
VITE_B2C_DOMAIN=<tenantDomain>
VITE_B2C_SUSI_POLICY=B2C_1A_signup_signin
VITE_B2C_REDIRECT_URI=/auth/callback
VITE_B2C_API_SCOPE=https://<tenantDomain>/cps-api/access_as_user
VITE_DEV_LOGIN=false
```

### 11. (Dev tenant only) Provision a B2C dev tenant for devs to test SSO locally

Repeat steps 1-10 with `parameters/dev.bicepparam`. Most local dev uses `DevBypassAuthHandler` + the DevLoginForm, but the dev tenant is required for engineers who need to validate the SSO round-trip before deploys.

### 12. `X-B2C-Api-Key` 90-day rotation

When `CpsValidateApiKey` nears expiry:

1. Generate a new secret value: `openssl rand -base64 32 | az keyvault secret set --vault-name <kv> --name CpsValidateApiKey --file -`.
2. Update the policy `Settings.CpsValidateApiKey` via Graph: re-run step 6 + step 7 (the regenerated `TrustFrameworkExtensions.xml` will pick up the new secret reference).
3. Rolling restart cps-dotnet (App Service slot swap or container restart) so it picks up the new value from Key Vault.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Microsoft.Graph/applications@beta` deploy fails | The provider isn't yet GA in your tenant | Use the `az ad app create` fallback in step 4 |
| Policy upload returns 400 | `Tenant ID="..."` in XML doesn't match the actual tenant | Re-run `replace-placeholders.ps1`; verify `tenantDomain` in the bicepparam |
| User-journey `Run now` returns "AADB2C90048: Unable to validate the policy" | IEF apps not registered (step 8) | Complete step 8 |
| SPA loads but API calls 401 | Token doesn't carry `extension_userId` | Check the IEF policy actually called `REST-CpsValidate` (Application Insights on cps-dotnet) |
````

- [ ] **Step 2: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet add infra/b2c/README.md
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet commit -m "docs(infra): B2C provisioning runbook"
```

## Task 3.9: Add CI hooks for Bicep + XML lint

**Files:**
- Modify: `.github/workflows/*.yml` (whichever workflow is the main CI)

The exact file depends on the project's existing CI layout. Common pattern: there's a `ci.yml` or `pr.yml` that runs on PRs.

- [ ] **Step 1: Identify the main CI workflow**

```bash
ls C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet/.github/workflows/
```

If multiple, pick the one that fires on PR (look for `pull_request:` trigger).

- [ ] **Step 2: Add a `bicep-lint` job to the CI workflow**

Append (or insert at the appropriate spot in) the YAML:

```yaml
  bicep-lint:
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.files.*.path, 'infra/b2c/')
    steps:
      - uses: actions/checkout@v4
      - name: Install Azure CLI
        run: |
          curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
          az bicep install
      - name: Bicep what-if (dev tenant)
        run: |
          az bicep build --file infra/b2c/main.bicep --stdout > /dev/null
          # Real what-if requires a tenant context — skip in CI, run manually
          echo "Bicep build OK"
      - name: Lint custom policy XML
        run: |
          sudo apt-get install -y libxml2-utils
          xmllint --noout infra/b2c/custom-policy-trustframework/*.xml
```

- [ ] **Step 3: Commit**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet add .github/workflows/
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet commit -m "ci(infra): bicep build + xml lint job for infra/b2c/ changes"
```

## Task 3.10: Push branch + open PR

- [ ] **Step 1: Push**

```bash
git -C C:/Users/Vijay.Yadav/source/ClaudeRepos/cps-dotnet push -u origin feature/b2c-infra
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --repo VijayYadav-arch/cps-dotnet --base main --head feature/b2c-infra --title "feat(infra): B2C tenant provisioning (Phase 3 of MSAL-only cutover)" --body "$(cat <<'EOF'
## Summary

Phase 3 of the MSAL-only cutover. Provisions Azure AD B2C tenant infrastructure that `cps-spa` (via MSAL) and `cps-dotnet` (via `B2CValidateController`) depend on.

**No application code changes** — all backend B2C wiring was already shipped previously.

## What's in

- `infra/b2c/main.bicep` + module bicep files for API/SPA app registrations and Key Vault secret
- IEF custom policy XML (Base + Extensions + SignUpOrSignin) — Extensions adds the `REST-CpsValidate` technical profile that calls `/api/v2/auth/b2c-validate`
- Per-env parameter files (dev / staging / prod) with placeholder values
- `replace-placeholders.ps1` to substitute `${TenantName}` and `${cpsApiBaseUrl}` per env
- `README.md` — 12-step runbook covering manual portal steps + automatable Bicep/Graph steps
- CI lint job: Bicep build + xmllint

## Test plan

- [ ] CI `bicep-lint` job passes
- [ ] Local: `az bicep build --file infra/b2c/main.bicep --stdout` succeeds
- [ ] Local: `pwsh ./replace-placeholders.ps1 -Env dev` writes resolved XML to `out/dev/`
- [ ] Local: `xmllint --noout infra/b2c/custom-policy-trustframework/*.xml` succeeds
- [ ] Manual (post-merge): execute runbook against a fresh B2C dev tenant per step 1-9; confirm the test user journey emits the four `extension_*` claims

## Follow-up work (not in this PR)

- Execute the runbook against a real dev B2C tenant (operational, owned by whoever has Azure portal access)
- Plumb `VITE_B2C_*` into the SPA's dev deployment pipeline once `spaClientId` is known

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Post-Merge Rollout Checklist

After Phases 1-3 merge, the cutover is *capable* but not *active*. The remaining steps are operational and have no code deliverables. Track them in whatever ticketing system the team uses.

## Step 4: Plumb `VITE_B2C_*` into dev SPA deployment

- [ ] Update the dev SPA deployment pipeline (Azure Static Web App config, GitHub Actions, or whichever) with the seven `VITE_*` env vars from runbook step 10.
- [ ] Redeploy the dev SPA.
- [ ] Smoke test: open dev SPA `/login` → SsoButton lights up (no longer disabled). Click it → MSAL redirect → B2C custom policy runs → land back on `/` with the user authenticated.
- [ ] Verify dev workflow still works: set `VITE_DEV_LOGIN=true` in dev → SsoButton replaced by DevLoginForm; pick identity → app loads with `X-Dev-Claims`.

## Step 5: Staging B2C tenant + staging SPA deploy

- [ ] Execute runbook steps 1-9 against a fresh staging B2C tenant. Use `parameters/staging.bicepparam`.
- [ ] Plumb `VITE_B2C_*` into the staging SPA deployment.
- [ ] Have an internal user smoke-test the full SSO journey in staging.
- [ ] Watch `B2CValidateController` audit logs for any unexpected 409s.

## Step 6: Pilot one prod org with `IsActive=true`, `EnforceSso=false`

- [ ] Execute runbook steps 1-9 against the prod B2C tenant.
- [ ] Plumb `VITE_B2C_*` into prod SPA deployment.
- [ ] Coordinate with one pilot org's admin: set `IsActive=true` on their `SSOConfiguration` (leave `EnforceSso=false`).
- [ ] Have a real user in that org sign in via SsoButton. Verify token contains expected `extension_*` claims.
- [ ] Monitor the audit-anomaly pipeline for `B2CValidateController` 409 spikes for one week minimum. None expected; spikes = provisioning gaps.

## Step 7: Pilot org flips `EnforceSso=true`

- [ ] Coordinate with the pilot org's admin. Set `EnforceSso=true` on their `SSOConfiguration`.
- [ ] Smoke-test: users in that org can SSO in. (Note: there's no longer a password path to test the "rejection" against — `AuthController` was removed.)
- [ ] Watch logs for one more week.

## Step 8: Open up to all prod orgs

- [ ] Document for org admins how to set `IsActive=true` on their own `SSOConfiguration`.
- [ ] Roll out to remaining orgs at their own pace.
- [ ] Once stable everywhere, consider a follow-on spec to remove `DevBypassAuthHandler` from prod-by-default config (it's already fail-closed in `IsProduction()` — this is a "remove the flag-flipping risk entirely" cleanup, not urgent).

---

## Self-review notes

This plan was self-reviewed for:
- **Spec coverage:** every section of the spec maps to one or more tasks. Section 1 (architecture) → Tasks 1.2-1.9 implement the predicates and branches. Section 2 (file inventory) → tasks 1.2-1.11 + 2.1-2.4 create/modify exactly the listed files. Section 3 (data flow) → Tasks 1.9 (AuthContext flow logic), 1.10 (apiClient interceptor), and the AuthContext tests verify each flow. Section 4 (Bicep + runbook) → Tasks 3.1-3.8. Section 5 (error taxonomy) → covered across AuthContext (logout redirect), apiClient (401 redirect with reason param), DevLoginForm (validation errors), Login (banner rendering). Section 6 (testing) → every component listed has a test file in Tasks 1.4, 1.5, 1.6, 1.8, 1.9, 1.10, 2.1, 2.2, 2.3. Section 7 (rollout) → Phases 1-3 cover the code work; the Post-Merge Checklist covers operational steps 4-8.
- **Placeholder scan:** no TBD/TODO/FIXME left in the plan itself. The `REPLACE-WITH-*` strings in `bicepparam` files are deliberate placeholders documented in the runbook (the tenant GUIDs aren't known until step 1 of the runbook).
- **Type consistency:** `UserInfo` consistent across `claims.ts`, `AuthContext.tsx`, `DevLoginForm.tsx`, tests. `DevClaims` consistent across `devLogin.ts`, `DevLoginForm.tsx`, tests. `useDevAuth()` referenced identically in every consumer.
