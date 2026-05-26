# cps-spa MSAL-Only Cutover — Design Spec

**Date:** 2026-05-26
**Repos touched:** `cps-spa` (primary), `cps-dotnet` (infra-only — Bicep + runbook for B2C tenant)
**Supersedes:** `2026-05-26-cps-spa-msal-cutover-design.md` (commit `1f77814`) — that spec assumed a `POST /api/v2/auth/login` backend endpoint existed and just needed an `EnforceSso` guard. The endpoint had already been deliberately deleted in commit `16cf7e0` (2026-05-01, "delete AuthController and AdminAuthController (legacy removed)"). This spec corrects the premise.
**Status:** Approved through brainstorming; ready for implementation planning

---

## Goal

Replace the dead email+password login code in `cps-spa` with Azure AD B2C as the sole staff login path, matching the architectural decision already executed on cps-dotnet (commit `16cf7e0`). Add a local dev affordance (`DevLoginForm`) that drives `DevBypassAuthHandler` via the `X-Dev-Claims` header so developers can impersonate any user/org/role without provisioning B2C locally. Provision the B2C tenant itself (which does not yet exist) via Bicep + IEF custom policies + a runbook.

The family/patient portal (`PortalAuthContext`, `cps_portal_token`, backend `FamilyJwt` scheme) is **explicitly out of scope** — different audience, different threat model.

---

## Section 1: Architecture Overview

### What changes

- `cps-spa` gets a single login path in production: Azure AD B2C via MSAL.js (`@azure/msal-browser` + `@azure/msal-react`). The dead email/password form is replaced by a branded landing page with a single "Sign in with company SSO" button.
- `AuthContext` is rewritten to wrap `MsalProvider`. State becomes `{ isAuthenticated: boolean, user: UserInfo | null }` — no `authMode` discriminator (only one production mode).
- `apiClient` switches from reading `sessionStorage['cps_token']` directly to an async `getAccessToken()` accessor the new `AuthContext` registers on mount. Prod: returns MSAL `acquireTokenSilent()`. Dev: returns `null` (no Bearer header attached).
- **Dev experience preserved via `X-Dev-Claims`**: when the SPA detects dev mode (predicate `useDevAuth()` — see below), `/login` renders a "Dev Identity Picker" form with fields for `userId`, `orgId`, `roles`, `permissions`. Submit pipes those into the `X-Dev-Claims` header (set on every apiClient request) AND synthesizes a local AuthContext state. Backend's `DevBypassAuthHandler` reads the header.

**Mode predicates (single source of truth)**

```ts
isB2CConfigured(): boolean = !!import.meta.env.VITE_B2C_CLIENT_ID
useDevAuth(): boolean      = !isB2CConfigured() || import.meta.env.VITE_DEV_LOGIN === 'true'
```

When `useDevAuth()` is `true`, the SPA is in dev mode end-to-end: Login page shows `DevLoginForm`, apiClient sends `X-Dev-Claims`, AuthContext synthesizes from dev claims, MSAL accounts (if cached) are ignored. When `useDevAuth()` is `false`, SsoButton is the only login surface and MSAL drives everything. `VITE_DEV_LOGIN=true` is a deliberate override for QA scenarios — "B2C is wired up in this env but I want to test the dev path." Production builds set `VITE_DEV_LOGIN=false` so the override can never accidentally enable dev mode in prod.
- New Bicep module under `cps-dotnet/infra/b2c/` provisions the B2C tenant (app registrations + API scope + Key Vault secret). IEF custom policy XML + runbook accompany the Bicep.
- **Zero backend code changes.** `B2CValidateController`, `B2COrApiKey` policy scheme, B2C default auth, and `DevBypassAuthHandler` are already correct.

### What does NOT change

- Family/patient portal (`PortalAuthContext`, `cps_portal_token`, FamilyJwt backend scheme).
- Next.js `cps` app — separate spec when needed.
- `DevBypassAuthHandler` itself — unchanged; we just teach the SPA to drive it via `X-Dev-Claims`.
- `B2CValidateController`, `B2COrApiKey` policy scheme, B2C as default scheme — already wired correctly.
- All non-auth `/api/v2/*` endpoints — same Bearer-header contract on the prod side.

### Boundary diagram

```text
Production:
  User -> /login -> SsoButton -> MSAL loginRedirect -> B2C SignUpOrSignin policy
                                                       (calls /b2c-validate to enrich)
                                                       -> redirect back to /auth/callback
                                                       -> MSAL exchanges code -> B2C access token
                                                                                  |
                                                                                  v
                                                            apiClient.getAccessToken() -> Bearer header
                                                                                  |
                                                                                  v
                                                            Backend B2COrApiKey policy -> B2C JWT handler

Dev (VITE_DEV_LOGIN=true OR VITE_B2C_CLIENT_ID unset):
  User -> /login -> Dev Identity form -> submit -> setDevClaims({ userId, orgId, roles, permissions })
                                                       -> synthesizes AuthContext state
                                                       -> ProtectedRoute lets through
                                                                                  |
                                                                                  v
                                                            apiClient interceptor: sets X-Dev-Claims header
                                                                                  -> NO Authorization header in dev
                                                                                  |
                                                                                  v
                                                            Backend B2COrApiKey policy -> DevBypassAuthHandler
                                                                                  (reads X-Dev-Claims)
```

---

## Section 2: Components & File Inventory

### New files (cps-spa)

| File | Purpose |
|---|---|
| `src/auth/msalConfig.ts` | MSAL `Configuration` factory + `loginRequest` scopes. Reads `import.meta.env.VITE_B2C_*`. Mirrors the cps `msal-config.ts` env-var conventions. Exports `isB2CConfigured()` and `useDevAuth()` predicates (per Section 1). `useDevAuth()` is the master switch consumed by `AuthContext`, `apiClient`, and the Login page. |
| `src/auth/getAccessToken.ts` | Module-scoped `getAccessToken()` + `setAccessTokenProvider(fn)` accessor pair. AuthContext registers its provider on mount; apiClient calls `getAccessToken()` in the request interceptor. |
| `src/auth/ssoAcquire.ts` | Thin wrapper around MSAL's `acquireTokenSilent` with `acquireTokenRedirect` fallback on `InteractionRequiredAuthError`. |
| `src/auth/claims.ts` | `parseCpsClaims(token: string): UserInfo` — extracts `userId / organizationId / rbac_role` from B2C-shaped tokens (`extension_*` claims via the custom policy). Throws `MalformedTokenError` on missing `userId`. Tolerates `rbac_role` as string or string[]. |
| `src/auth/errors.ts` | Exports `MalformedTokenError` and `DevClaimsValidationError`. |
| `src/auth/devLogin.ts` | Dev-only module. Exports `setDevClaims(claims: DevClaims)`, `getDevClaims(): DevClaims \| null`, `clearDevClaims()`. Stores in `sessionStorage['cps_dev_claims']` and fires `cps:dev-claims-changed` custom event. apiClient reads via `getDevClaims()` to set `X-Dev-Claims` header. AuthContext reads to seed initial state on cold boot. |
| `src/auth/SsoButton.tsx` | "Sign in with company SSO" button. Lives in `src/auth/` because it's bound to auth logic. Disabled with tooltip when `useDevAuth()` is true (i.e., the SPA is in dev mode and clicking SsoButton would not match the active apiClient branch). |
| `src/auth/DevLoginForm.tsx` | Dev-only form. Fields: `userId` (number), `organizationId` (number), `roles` (comma-separated → string[]), `permissions` (comma-separated → string[]). Submit calls `setDevClaims(...)` + AuthContext re-syncs. Renders only when `useDevAuth()` is true. Prod builds tree-shake the module via `import.meta.env.PROD` gate. |
| `src/auth/__tests__/msalConfig.test.ts` | Env-var parsing; `isB2CConfigured()` returns false when `VITE_B2C_CLIENT_ID` is empty; `useDevAuth()` returns true when `isB2CConfigured()` is false OR `VITE_DEV_LOGIN === 'true'`; returns false otherwise. |
| `src/auth/__tests__/ssoAcquire.test.ts` | Silent-then-redirect fallback paths. |
| `src/auth/__tests__/claims.test.ts` | Extract from B2C `extension_*` token shapes; throws on missing `userId`; tolerates `rbac_role` as string or string[]. |
| `src/auth/__tests__/getAccessToken.test.ts` | Provider registration + null-when-unset semantics. |
| `src/auth/__tests__/devLogin.test.ts` | `setDevClaims` writes to sessionStorage + dispatches event; `getDevClaims` parses; `clearDevClaims` removes + dispatches event with null; malformed JSON returns null without throwing. |
| `src/auth/__tests__/SsoButton.test.tsx` | Click triggers `loginWithSSO()`; disabled state when `isB2CConfigured()` returns false. |
| `src/auth/__tests__/DevLoginForm.test.tsx` | Renders nothing in prod when B2C configured + `VITE_DEV_LOGIN` unset; renders fields in dev mode; submit calls `setDevClaims` with parsed values; negative userId shows inline `DevClaimsValidationError`; empty roles shows error; defaults populate from prior session's dev claims. |
| `src/auth/__tests__/fakes/msal.ts` | `createFakePca({ accounts, tokenResponses })` implementing the `IPublicClientApplication` surface AuthContext + ssoAcquire touch (`loginRedirect`, `logoutRedirect`, `acquireTokenSilent`, `acquireTokenRedirect`, `getAllAccounts`, `addEventCallback`, `handleRedirectPromise`, `initialize`). |

### Modified files (cps-spa)

| File | Change |
|---|---|
| `src/auth/AuthContext.tsx` | **Full rewrite.** Wraps `MsalProvider`. Exposes `auth`, `loginWithSSO()`, `logout()`. Removes inline `decodeToken`, `loginWithPassword`, all `sessionStorage['cps_token']` references. On mount: branches on `useDevAuth()`. Dev-mode branch reads `getDevClaims()` + subscribes to `cps:dev-claims-changed`. SSO branch listens for MSAL `LOGIN_SUCCESS`. Registers `getAccessToken` provider. Accepts optional `pca?: IPublicClientApplication` prop for test injection. |
| `src/auth/useAuth.ts` | Adds `loginWithSSO` to the destructured return; removes `login` (the password one). |
| `src/auth/ProtectedRoute.tsx` | No behavior change. Still checks `auth.isAuthenticated`. |
| `src/api/client.ts` | Async request interceptor: branches on `useDevAuth()`. Dev branch sets `X-Dev-Claims` header from `getDevClaims()` (omits Bearer). SSO branch sets `Authorization: Bearer ${await getAccessToken()}` (omits X-Dev-Claims). Mutually exclusive at runtime — prod tree-shakes the dev branch. On 401: calls `logout()` and `window.location.href = '/login?reason=expired'`. |
| `src/pages/Login.tsx` | **Full rewrite.** Renders `<DevLoginForm />` when `useDevAuth()`, `<SsoButton />` otherwise. Reads `?reason=expired` and `?reason=invalid_token` query params and renders the corresponding banner above the active surface. |
| `src/App.tsx` | Removes any direct sessionStorage reads. AuthProvider stays at root. |
| `package.json` | Adds `@azure/msal-browser` + `@azure/msal-react` runtime deps. |
| `src/auth/__tests__/AuthContext.test.tsx` | **Rewrite.** Seven cases: (1) `loginWithSSO` calls `loginRedirect(loginRequest)`; (2) MSAL `LOGIN_SUCCESS` event hydrates auth state with parsed claims; (3) `logout` calls `logoutRedirect` when configured; (4) cold boot reads dev claims when set + no MSAL account; (5) cold boot prefers MSAL account when present, ignores dev claims; (6) when neither present, stays unauthenticated; (7) `cps:dev-claims-changed` event re-syncs auth state mid-session. |
| `src/api/__tests__/client.test.ts` | Replaces `sessionStorage.setItem('cps_token', ...)` setup with `setAccessTokenProvider(() => 'test.token')`. Adds X-Dev-Claims attachment test when `setDevClaims` was called. Branches are mutually exclusive. |
| `src/__tests__/App.test.tsx` | Existing role-routing tests use `setAccessTokenProvider(() => testToken)` + `setDevClaims(...)` instead of sessionStorage hacks. Covers admin / billing_manager / clinician routing. |
| `src/pages/__tests__/Login.test.tsx` | **Rewrite.** Renders SsoButton when configured; DevLoginForm when not; both when `VITE_DEV_LOGIN=true`. `?reason=expired` and `?reason=invalid_token` render the corresponding banner. |
| `.env.example` | Adds the seven `VITE_*` vars (six B2C + `VITE_DEV_LOGIN`). |

### cps-dotnet code changes

**None.** The `AuthController` was already removed in commit `16cf7e0`; B2C wiring + `DevBypassAuthHandler` are already correct.

### New files (cps-dotnet) — infrastructure only

| File | Purpose |
|---|---|
| `infra/b2c/main.bicep` | Top-level Bicep module; params + module wiring. |
| `infra/b2c/app-registration-api.bicep` | API app registration; exposes `cps-api/access_as_user` scope. |
| `infra/b2c/app-registration-spa.bicep` | SPA-type (PKCE-only) registration; redirect URIs per env. |
| `infra/b2c/api-key-secret.bicep` | `X-B2C-Api-Key` in Key Vault with 90-day rotation policy. |
| `infra/b2c/parameters/dev.bicepparam` | Per-env params. |
| `infra/b2c/parameters/staging.bicepparam` | |
| `infra/b2c/parameters/prod.bicepparam` | |
| `infra/b2c/custom-policy-trustframework/TrustFrameworkBase.xml` | IEF starter pack (unmodified). |
| `infra/b2c/custom-policy-trustframework/TrustFrameworkExtensions.xml` | CPS extension: `REST-CpsValidate` technical profile calling `${cpsApiBaseUrl}/api/v2/auth/b2c-validate` and mapping response into `extension_*` claims. |
| `infra/b2c/custom-policy-trustframework/SignUpOrSignin.xml` | User journey orchestrating REST call → claim emission. |
| `infra/b2c/replace-placeholders.ps1` | Substitutes `{TenantName}` + `{cpsApiBaseUrl}` per env; writes resolved files to `./out/{env}/`. |
| `infra/b2c/README.md` | Runbook (12 numbered steps). |

---

## Section 3: Data Flow

### Flow 1 — Production SSO login (happy path)

1. User visits a protected route. `ProtectedRoute` sees `auth.isAuthenticated === false`, navigates to `/login`.
2. Login page calls `isB2CConfigured()` → `true` → renders `<SsoButton />`. User clicks it.
3. `loginWithSSO()` calls `msalInstance.loginRedirect(loginRequest)`. Browser leaves the SPA.
4. B2C runs `B2C_1A_signup_signin`. The custom policy makes a server-to-server `POST` to `/api/v2/auth/b2c-validate` with the user's email + the `X-B2C-Api-Key` shared secret. `B2CValidateController` returns `{ userId, organizationId, rbacRoles, permissions }` or 409.
5. B2C embeds those as `extension_userId`, `extension_organizationId`, `extension_rbac_role`, `extension_permissions` claims in the access token, redirects back to `redirectUri` (`/auth/callback`) with the auth code.
6. MSAL exchanges code for tokens (in-memory + sessionStorage cache per `msalConfig.cache.cacheLocation`). `MsalProvider` fires `EventType.LOGIN_SUCCESS`.
7. AuthContext's event listener catches `LOGIN_SUCCESS`, calls `ssoAcquire.getToken()`, parses claims via `claims.ts`, sets `authState = { isAuthenticated: true, user }`, navigates to the original destination (or `/`).
8. Every subsequent API call: apiClient async interceptor → `getAccessToken()` → MSAL `acquireTokenSilent()` (cached) → `Authorization: Bearer <b2c-token>`. Backend `B2COrApiKey` policy routes to the `B2C` JWT handler.

### Flow 2 — Dev login (happy path)

1. User visits a protected route. `ProtectedRoute` sees unauthenticated, navigates to `/login`.
2. Login page calls `useDevAuth()` → `true` (because either `VITE_B2C_CLIENT_ID` is unset or `VITE_DEV_LOGIN=true`) → renders `<DevLoginForm />`.
3. Form fields populate with sensible defaults from `getDevClaims()` if previously set (last session's identity). User edits `userId / organizationId / roles / permissions` and submits.
4. Form calls `setDevClaims({ userId: 1, organizationId: 2, roles: ['system_admin'], permissions: ['platform:dashboard'] })`. This writes to `sessionStorage['cps_dev_claims']` AND fires a `cps:dev-claims-changed` custom event.
5. AuthContext listens for `cps:dev-claims-changed`, reads `getDevClaims()`, synthesizes `authState = { isAuthenticated: true, user: { userId: 1, organizationId: 2, roles: ['system_admin'] } }`, navigates to the original destination.
6. Subsequent API calls: apiClient async interceptor → `getAccessToken()` returns `null` (no MSAL in dev) → no `Authorization` header. **Also**: interceptor reads `getDevClaims()`, serializes to the existing backend format `userId=1;organizationId=2;rbac_role=system_admin;permission=platform:dashboard`, and sets `X-Dev-Claims` header.
7. Backend `B2COrApiKey` policy sees no Authorization header → routes to `DevBypassAuthHandler` (when `Auth:DevBypass:Enabled=true`). DevBypass reads `X-Dev-Claims` (header beats config), constructs the principal.

### Flow 3 — Token attachment (apiClient request interceptor)

```text
async (config):
  if useDevAuth():
    devClaims = getDevClaims()
    if devClaims: config.headers.set('X-Dev-Claims', serialize(devClaims))
  else:
    token = await getAccessToken()        // MSAL acquireTokenSilent
    if token: config.headers.set('Authorization', `Bearer ${token}`)
  return config
```

The two branches are mutually exclusive at request time — `useDevAuth()` is the single switch. Production builds set `VITE_DEV_LOGIN=false` so the dev branch can never accidentally activate in prod, AND tree-shake `devLogin.ts` via `import.meta.env.PROD`.

### Flow 4 — Cold boot / page reload

```text
AuthContext mount:
  if useDevAuth():
    devClaims = getDevClaims()
    if devClaims:
      setAuthState({ isAuthenticated: true, user: synthFromDevClaims(devClaims) })
    else:
      stay unauthenticated; ProtectedRoute routes to /login
  else:
    accounts = msalInstance.getAllAccounts()
    if accounts.length > 0:
      try:
        token = await ssoAcquire.getToken()
        user = parseCpsClaims(token)
        setAuthState({ isAuthenticated: true, user })
      catch InteractionRequiredAuthError:
        // cookie expired; ssoAcquire triggers acquireTokenRedirect
        stay unauthenticated; redirect happens
      catch MalformedTokenError:
        msalInstance.logoutRedirect({ postLogoutRedirectUri: '/login?reason=invalid_token' })
```

In QA / staging mode (`VITE_B2C_CLIENT_ID` set AND `VITE_DEV_LOGIN=true`), `useDevAuth()` is `true` — any cached MSAL account is **deliberately ignored** so the dev form is exercised end-to-end. To exit dev mode, the QA dev must flip `VITE_DEV_LOGIN` back to false and reload.

### Flow 5 — Logout

`logout()` branches on `useDevAuth()`:

- **SSO mode:** `msalInstance.logoutRedirect({ postLogoutRedirectUri: '/login' })`. Clears MSAL cache AND ends the B2C session (otherwise next "login" would silently reauth without prompting).
- **Dev mode:** `clearDevClaims()` → removes sessionStorage entry, fires `cps:dev-claims-changed` with `null`, AuthContext resets to unauthenticated, navigates to `/login`. (No upstream session to terminate.)

### Flow 6 — 401 from API

Response interceptor (mode-agnostic):

```text
on 401:
  logout()                              // mode-aware as above
  window.location.href = '/login?reason=expired'
```

`/login` reads `?reason=expired` and renders "Your session ended. Please sign in again." above the active surface.

**No retry-with-refresh on 401**: MSAL already exhausted silent acquisition before the request went out. If a 401 came back, the token was valid-format but rejected (revoked, claims mismatch, org-key rotation, dev-claims malformed). Retrying would loop. Logout + redirect is the only correct response.

---

## Section 4: Azure Infrastructure (Bicep + Runbook)

### What Bicep can and can't do for B2C

Bicep + ARM cover Azure **resources**. They do NOT cover:

- Creating the B2C tenant itself (portal click-through; tenant is a separate Azure AD directory).
- Uploading IEF custom policy XML (via `Microsoft.Graph trustFrameworkPolicy` REST endpoints).
- Creating user flows (portal click-through).

So we split: **Bicep for what it can do** + a **runbook** for the manual + Graph-API pieces.

### Bicep layout (`cps-dotnet/infra/b2c/`)

```text
infra/b2c/
├── main.bicep
├── app-registration-api.bicep
├── app-registration-spa.bicep
├── api-key-secret.bicep
├── parameters/
│   ├── dev.bicepparam
│   ├── staging.bicepparam
│   └── prod.bicepparam
├── custom-policy-trustframework/
│   ├── TrustFrameworkBase.xml
│   ├── TrustFrameworkExtensions.xml
│   └── SignUpOrSignin.xml
├── replace-placeholders.ps1
└── README.md
```

### `main.bicep` parameters

- `tenantId` — B2C tenant GUID (created manually first)
- `environment` — `dev` | `staging` | `prod`
- `spaRedirectUris` — array; differs per env
- `apiAppName`, `spaAppName`
- `keyVaultName` — where `X-B2C-Api-Key` rotates
- `cpsApiBaseUrl` — used by custom policy to call `/api/v2/auth/b2c-validate`

### Custom policy XML

- **`TrustFrameworkBase.xml`** — IEF starter pack base, unchanged.
- **`TrustFrameworkExtensions.xml`** — adds the `REST-CpsValidate` technical profile that calls `${cpsApiBaseUrl}/api/v2/auth/b2c-validate` with `X-B2C-Api-Key={SettingsSecret:CpsValidateApiKey}` header and maps response fields (`userId`, `organizationId`, `rbacRoles`, `permissions`) into `extension_*` output claims matching the SPA's `claims.ts` parser.
- **`SignUpOrSignin.xml`** — orchestration: collect email → call `REST-CpsValidate` → on 409, surface `userMessage` and end journey; on 200, issue token with enriched claims.

XMLs reference `${TenantName}` and `${cpsApiBaseUrl}` placeholders; `replace-placeholders.ps1` substitutes per env.

### Runbook — 12 steps

1. **Create B2C tenant** — portal: Azure AD B2C → Create tenant. Record tenant GUID + domain (`{name}.onmicrosoft.com`).
2. **Link tenant to subscription** — portal: tenant blade → Resource → Link to subscription.
3. **Switch directory context** — `az login --tenant {b2c-tenant-guid}`.
4. **Deploy Bicep app registrations** — `az deployment group create --template-file main.bicep --parameters parameters/{env}.bicepparam`. Captures output `spaClientId` + `apiAppIdUri`.
5. **Generate `X-B2C-Api-Key` + store in Key Vault** — `az keyvault secret set ...`. Update cps-dotnet `B2CValidation:ApiKey` config to read from Key Vault.
6. **Substitute placeholders in policy XML** — `pwsh ./replace-placeholders.ps1 -Env {env}`.
7. **Upload custom policies via Graph** — order matters: Base → Extensions → SignUpOrSignin. `az rest --method PUT --url 'https://graph.microsoft.com/beta/trustFramework/policies/B2C_1A_TrustFrameworkBase/$value' --body @TrustFrameworkBase.xml`. Repeat for the others.
8. **Add IEF apps + signing/encryption keys** — portal: create `IdentityExperienceFramework` + `ProxyIdentityExperienceFramework` apps; create `TokenSigningKeyContainer` + `TokenEncryptionKeyContainer` policy keys.
9. **Smoke test the user journey** — portal: Custom policies → `B2C_1A_signup_signin` → Run now. Confirm B2C calls `/b2c-validate` and the resulting token contains the four `extension_*` claims.
10. **Plumb env vars into SPA build** — add `VITE_B2C_*` to the SPA's deployment pipeline. Document in `.env.example`.
11. **Provision a B2C dev tenant** — same Bicep + same runbook, different `dev.bicepparam`. Required so devs can exercise real SSO before deploys (most dev work uses `DevBypassAuthHandler` + dev form).
12. **Document `X-B2C-Api-Key` 90-day rotation** — update Key Vault secret → update policy `Settings.CpsValidateApiKey` via Graph → rolling restart of cps-dotnet.

### Explicitly not automated

B2C tenant creation, IEF app + key creation, and the first-time portal click to grant admin consent on the SPA registration. These are one-time-per-tenant manual steps; automating with Graph would be more brittle than the click-through.

---

## Section 5: Error Handling

### Taxonomy

| # | Source | Trigger | UI | Recovery |
|---|---|---|---|---|
| 1 | B2C policy | User not provisioned in CPS (`B2CValidateController` 409 + `userMessage`) | B2C displays `userMessage` on its own error page; offers "Return to {AppName}" → `/login` | User contacts org admin (or admin uses invite flow); user retries. |
| 2 | B2C policy | User's org has `EnforceSso=true` but came in via wrong identity provider | Same as #1, with SSO-required `userMessage` | User logs in via org SSO. |
| 3 | MSAL (interactive) | User cancels B2C login, closes window, network drop during redirect | MSAL `BrowserAuthError` caught in `loginWithSSO()`. AuthContext stays unauthenticated; non-blocking toast: "Sign-in cancelled" | User clicks SsoButton again. |
| 4 | MSAL (silent acquire) | `acquireTokenSilent` → `InteractionRequiredAuthError` | `ssoAcquire` catches and calls `acquireTokenRedirect()`. State preserved by MSAL `state` parameter | Automatic; user bounces through B2C and lands back. |
| 5 | apiClient | 401 from any API call | Interceptor calls `logout()`, then `window.location.href = '/login?reason=expired'`. Banner: "Your session ended. Please sign in again." | User signs in (SSO or dev form). |
| 6 | Claims parser | Token present but `claims.ts` can't extract `userId` | `parseCpsClaims` throws `MalformedTokenError`. AuthContext clears state, logs error with `iss` claim only (no PII), redirects to `/login?reason=invalid_token` | Sysadmin investigates (likely policy misconfig); user retries. |
| 7 | Dev mode | DevLoginForm input fails validation (negative userId, empty roles, malformed permissions) | Inline error rendered next to offending field; submit disabled until valid | User corrects input. |
| 8 | Dev mode | apiClient gets 401 even with `X-Dev-Claims` set | Means `Auth:DevBypass:Enabled=false` on the backend or env is Production. Same as #5 — clear devClaims, redirect to `/login?reason=expired`. Banner adds dev hint: "Dev bypass is disabled on the backend. Set `Auth:DevBypass:Enabled=true` in appsettings." | Developer fixes backend config and retries. |

### Error types (`src/auth/errors.ts`)

```ts
class MalformedTokenError extends Error {}               // claims.ts parse failure
class DevClaimsValidationError extends Error {           // DevLoginForm submit
  constructor(readonly field: string, readonly message: string) { super(`${field}: ${message}`); }
}
```

The previous spec's `SsoRequiredError` and `CredentialError` are gone — they only existed for the (now-deleted) local-login 409 path.

### Logging discipline

Auth errors never log the bearer token or full JWT payload. Logged fields: error class name, `iss` claim (if token present), HTTP status (if applicable), route the failure happened on. Backend's audit-anomaly pipeline (PR #118) already watches `B2CValidateController` 409s.

### Non-obvious decision

**Dev mode 401 hint is shown on the SPA Login page (category #8)**, not in console-only log. When a dev clones the repo and runs `npm run dev` without setting `Auth:DevBypass:Enabled=true` on the backend, they'd otherwise hit a confusing redirect loop with no UI indication. The hint short-circuits that. Production builds tree-shake the dev-mode hint code via `import.meta.env.PROD`.

### Explicitly NOT handled

- **Multi-tab logout sync** (BroadcastChannel) — deferred. Multi-tab is rare for staff portals.
- **Step-up auth (MFA mid-session)** — naturally handled by `InteractionRequiredAuthError` (category #4).
- **Offline / network failures during login redirect** — browser shows its own error page.
- **B2C tenant unreachable** (network partition, B2C outage) — MSAL throws `BrowserAuthError("endpoints_resolution_error", ...)`. Treated as category #3 (failed interactive). User retries when network comes back.

---

## Section 6: Testing Strategy

### Test pyramid

- **Unit (vitest, jsdom)** — most coverage; pure functions + isolated React components with fake MSAL.
- **Integration (vitest)** — `AuthContext` + `apiClient` + `Login` page composed; MSAL stubbed; backend mocked via `msw` for the 401 path.
- **End-to-end** — out of scope. Real B2C E2E requires a live dev tenant + Playwright; `cps-validator` is the natural home as a Phase 4 scenario.

### MSAL mocking — injected fake `PublicClientApplication`

`createFakePca({ accounts, tokenResponses })` helper in `src/auth/__tests__/fakes/msal.ts` implements just the surface AuthContext + `ssoAcquire` touch: `loginRedirect`, `logoutRedirect`, `acquireTokenSilent`, `acquireTokenRedirect`, `getAllAccounts`, `addEventCallback`, `handleRedirectPromise`, `initialize`.

AuthContext accepts an optional `pca?: IPublicClientApplication` prop, defaulting to the real instance. Tests pass the fake. No `vi.mock` of MSAL itself — keeps test setup readable and lets TypeScript catch surface drift.

### Test inventory (cps-spa)

| File | Coverage |
|---|---|
| `src/auth/__tests__/msalConfig.test.ts` | Env-var parsing; authority URL composition; `knownAuthorities`; `isB2CConfigured()` returns false when `VITE_B2C_CLIENT_ID` is empty |
| `src/auth/__tests__/claims.test.ts` | Extract from B2C `extension_*` token shapes; throws `MalformedTokenError` on missing `userId`; tolerates `rbac_role` as string or string[] |
| `src/auth/__tests__/ssoAcquire.test.ts` | `acquireTokenSilent` cached returns; `InteractionRequiredAuthError` triggers `acquireTokenRedirect` exactly once; other errors propagate |
| `src/auth/__tests__/getAccessToken.test.ts` | `setAccessTokenProvider` registers; `getAccessToken` returns null when no provider; returns provider value when set |
| `src/auth/__tests__/devLogin.test.ts` | `setDevClaims` writes to sessionStorage + dispatches event; `getDevClaims` parses; `clearDevClaims` removes + dispatches event with null; malformed JSON returns null without throwing |
| `src/auth/__tests__/AuthContext.test.tsx` | Seven cases: (1) `loginWithSSO` calls `loginRedirect(loginRequest)`; (2) MSAL `LOGIN_SUCCESS` event hydrates auth state with parsed claims (SSO mode only); (3) `logout` calls `logoutRedirect` in SSO mode; (4) cold boot in dev mode reads `getDevClaims()` and synthesizes state; (5) cold boot in SSO mode reads MSAL account and ignores any dev claims that may still be in storage; (6) when neither path yields an identity, stays unauthenticated; (7) `cps:dev-claims-changed` event re-syncs auth state mid-session (dev mode only) |
| `src/auth/__tests__/ProtectedRoute.test.tsx` | Redirects to `/login` when unauthenticated; renders children when authenticated |
| `src/auth/__tests__/SsoButton.test.tsx` | Click triggers `loginWithSSO()`; disabled state when `useDevAuth()` returns true |
| `src/auth/__tests__/DevLoginForm.test.tsx` | Renders nothing when `useDevAuth()` is false; renders fields when true; submit calls `setDevClaims` with parsed values; negative userId shows inline `DevClaimsValidationError`; empty roles shows error; defaults populate from prior session's dev claims |
| `src/api/__tests__/client.test.ts` | Interceptor calls `getAccessToken()` (not sessionStorage); sets `X-Dev-Claims` header when `getDevClaims()` returns a value; 401 calls `logout()` then navigates to `/login?reason=expired`; both branches mutually exclusive |
| `src/pages/__tests__/Login.test.tsx` | Renders DevLoginForm when `useDevAuth()` is true; SsoButton when false; `?reason=expired` and `?reason=invalid_token` render the corresponding banner above the active surface |
| `src/__tests__/App.test.tsx` | Existing role-routing tests use `setAccessTokenProvider(() => testToken)` + `setDevClaims(...)` instead of sessionStorage hacks; covers admin / billing_manager / clinician routing |

### Backend test inventory

**None.** Zero backend code changes — no new tests required. Existing `B2CValidateControllerTests` and `DevBypassAuthHandler` tests continue to pass unchanged.

### Bicep test posture

- `infra/b2c/*.bicep` get an `az deployment group what-if` in CI against the dev tenant. Fails the PR if it would change resources outside the b2c resource group.
- Policy XML files get a basic well-formedness lint (`xmllint --noout`) in CI. No semantic validation — runbook step 9 (live "Run now" in the portal) is the only meaningful test of policy logic.

### Explicitly skipped

- MSAL internal flow tests (PKCE handshake, refresh endpoint behavior) — MSAL's responsibility.
- B2C policy execution in CI — no way to run IEF policy outside a live tenant.
- Snapshot tests of Login page rendering — brittle; structural assertions only.
- Cross-browser MSAL behavior — vitest+jsdom is sufficient for our wrapper logic.
- DevLoginForm in production builds — `import.meta.env.PROD` tree-shakes the module; build verifies absence.

### Coverage target

Same convention as the rest of cps-spa: "every public function in `src/auth/` and every branch in `apiClient` has a test." Inventory above achieves that.

---

## Section 7: Rollout & Dev Experience

### Rollout sequence (each step independently revertable)

Zero backend code changes → shorter, simpler than the prior spec.

1. **`cps-spa` MSAL + dev-form scaffolding (no UI yet).** Adds MSAL deps; creates `msalConfig`, `getAccessToken`, `ssoAcquire`, `claims`, `errors`, `devLogin`, `fakes/msal`. Rewrites `AuthContext` (removes dead `loginWithPassword` + inline `decodeToken`). Updates `apiClient` to use `getAccessToken()` + `X-Dev-Claims`. **Login page still renders the old form but it no longer hits a backend.** Tests for everything in `src/auth/` pass. Safe to merge: existing `Auth:DevBypass:Enabled=true` dev workflow still works because apiClient sends no Authorization header in dev mode, and DevBypass picks up requests regardless of whether X-Dev-Claims is present.
2. **`cps-spa` Login page rewrite + DevLoginForm + SsoButton.** Login page conditionally renders the right surface. Devs gain the dev-identity picker. Default dev experience: "open form, pick userId/orgId/roles, submit, click around." Prod build tree-shakes DevLoginForm. Safe to ship to prod even before B2C tenant exists — SsoButton renders but is disabled with tooltip "B2C not configured."
3. **B2C dev tenant + Bicep + custom policy upload.** Runbook steps 1–9 against a fresh dev B2C tenant. Smoke-test in the portal. No SPA changes; pure Azure work. Outputs the `VITE_B2C_*` env vars for step 4.
4. **Plumb `VITE_B2C_*` into dev SPA deployment.** SsoButton lights up. Devs choose between SSO (real round-trip) or dev form (synthetic claims). Both work against the same backend.
5. **Staging B2C tenant + Bicep + staging SPA deploy.** First realistic exercise. Internal users smoke-test the full SSO journey in staging.
6. **Pilot one prod org with `IsActive=true`, `EnforceSso=false`.** Users in that org SSO in via SsoButton. Monitor `B2CValidateController` 409 rate. One week minimum.
7. **Pilot org flips to `EnforceSso=true`.** First time B2C's own EnforceSso enforcement runs against a real org in prod.
8. **Open up to all prod orgs.** Each org's admin sets their own `EnforceSso` when ready.

### Dev experience after the cutover

| Scenario | What dev does |
|---|---|
| Local dev, no Azure access (default) | `Auth:DevBypass:Enabled=true` in `appsettings.Development.json`. `npm run dev` on cps-spa. Navigate to `/login` → DevLoginForm appears → enter identity → submit → app loads. Change identity mid-session by going back to `/login`. |
| Local dev, test real SSO | Set `VITE_B2C_*` to dev B2C tenant. Click SsoButton on `/login`. Full round-trip works against local cps-dotnet (B2C calls `/api/v2/auth/b2c-validate` against your local backend if tunneled via ngrok; otherwise dev backend). |
| CI / vitest | MSAL replaced by `createFakePca`. DevLoginForm and SsoButton both rendered in tests with mocked dependencies. No tenant or backend needed. |
| `cps-validator` smoke tests | Untouched. Uses `Auth:DevBypass` and doesn't need MSAL. |

### Env-var inventory (cps-spa)

```text
VITE_B2C_CLIENT_ID         # SPA app registration client ID (Bicep output); empty = dev mode
VITE_B2C_INSTANCE          # https://{tenantName}.b2clogin.com/tfp/
VITE_B2C_DOMAIN            # {tenantName}.onmicrosoft.com
VITE_B2C_SUSI_POLICY       # B2C_1A_signup_signin
VITE_B2C_REDIRECT_URI      # /auth/callback (or full URL per env)
VITE_B2C_API_SCOPE         # https://{tenant}/cps-api/access_as_user
VITE_DEV_LOGIN             # 'true' to show DevLoginForm even when B2C is configured (e.g. during staging tests)
```

All seven get documented defaults in `.env.example`. **`useDevAuth() = !isB2CConfigured() || VITE_DEV_LOGIN === 'true'`** is the single source of truth for "are we in dev mode" — consumed by AuthContext, apiClient, Login page, and the auth components. Production deployments set `VITE_DEV_LOGIN=false` so the override can never accidentally enable dev mode in prod.

### Feature flags / observability

- **No new feature flags.** Dev/prod behavior determined by env vars; `VITE_DEV_LOGIN` is a safety hatch, not a runtime toggle.
- **Audit-anomaly pipeline (PR #118)** already watches `B2CValidateController` 409s. No extension needed (no `AuthController` to watch).
- **One new structured log on cps-spa:** `console.info('[auth] login success', { source })` where `source` is `'sso'` or `'dev'` — one line, one field, no PII.
- **Existing `MalformedTokenError` console logging** covers token failures.

### Rollback per step

| Step | Rollback |
|---|---|
| 1 (scaffolding) | Revert PR. Dev experience returns to "form does nothing but dev bypass works on the backend." |
| 2 (Login UI rewrite) | Revert PR. Old dead form returns. Devs go back to relying on `Auth:DevBypass` config without per-session identity switching. |
| 3 (dev B2C tenant) | Delete the tenant. No code changes to back out. |
| 4 (dev SPA env vars) | Remove `VITE_B2C_*` from dev deployment. SsoButton disables; DevLoginForm becomes the only path. |
| 5 (staging B2C) | Same as 3 — delete the staging tenant; redeploy staging SPA without the env vars. |
| 6 (pilot org, EnforceSso=false) | Set `IsActive=false` on that org's `SSOConfiguration`. SsoButton stops working for that org's users. |
| 7 (pilot org, EnforceSso=true) | Flip `EnforceSso` back to `false`. Org returns to "SSO available but not mandatory." |
| 8 (broad rollout) | Each org independently revertable via 6/7. |

### Cleanup task post-rollout (not part of this spec)

Once all prod orgs are on B2C and the dev workflow has settled, a follow-on spec could remove `DevBypassAuthHandler` from cps-dotnet entirely and replace it with a "fully mocked B2C dev tenant" pattern. Not recommended until B2C is rock-solid in prod; `DevBypass` is too useful to retire prematurely.

---

## Open Questions

None at spec-approval time. All design decisions made in brainstorming are documented above.

## Out of Scope (Future Specs)

- Retire `DevBypassAuthHandler` entirely (separate spec, after B2C proves stable across all orgs).
- Next.js `cps` dual-auth cleanup (separate spec).
- `B2CMigrationService` operational runbook for migrating existing users into B2C (operational task, not a code spec).
- BroadcastChannel-based multi-tab logout sync (deferred unless requested).
- E2E SSO scenarios in `cps-validator` (Phase 4 candidate).

---

## References

- Prior (superseded) spec: `cps-spa/docs/superpowers/specs/2026-05-26-cps-spa-msal-cutover-design.md` (commit `1f77814`)
- AuthController removal: cps-dotnet commit `16cf7e0` (`feat(t3): delete AuthController and AdminAuthController (legacy removed)`, 2026-05-01)
- Backend B2C entry point: `cps-dotnet/src/CPS.Api/Controllers/Auth/B2CValidateController.cs`
- DevBypassAuthHandler (`X-Dev-Claims` source): `cps-dotnet/src/CPS.Api/Authentication/DevBypassAuthHandler.cs` (PR #130)
- Existing MSAL config in Next.js cps: `cps/src/lib/msal-config.ts` (env-var naming inspiration)
- Existing Bicep convention: `cps-dotnet/infra/functions/*.bicep`
- Migration plan: `cps/docs/dotnet-migration-plan.md` (Phase 3 auth migration)
- SSO completion spec (precedent): `cps-dotnet/docs/superpowers/specs/2026-05-13-sso-completion-design.md`
- Audit anomaly pipeline used for observability: PR #118
