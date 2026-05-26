# cps-spa MSAL Cutover — Design Spec

> ## ⚠️ SUPERSEDED — DO NOT IMPLEMENT
>
> **This spec is superseded by [`2026-05-26-cps-spa-msal-only-design.md`](./2026-05-26-cps-spa-msal-only-design.md).**
>
> **Why:** This spec assumed `POST /api/v2/auth/login` existed on cps-dotnet and just needed an `EnforceSso` guard. That endpoint had already been deliberately deleted three weeks earlier in commit `16cf7e0` (2026-05-01: *"delete AuthController and AdminAuthController (legacy removed) — Remove legacy password-based auth controllers now that B2C is the sole auth path"*). The whole `t3` commit series in early May systematically removed local password auth (BCrypt, JwtDenyList, AuthService, etc.). The "keep both auth paths, no flag" decision in this spec was therefore based on a false premise.
>
> The replacement spec drops the dual-auth framing entirely: B2C is the only production path, and a `DevLoginForm` driving `X-Dev-Claims` against `DevBypassAuthHandler` provides the local-testing affordance without resurrecting a password endpoint.
>
> Kept here as a record of the brainstorming history, not as a buildable spec.

---

**Date:** 2026-05-26
**Repos touched:** `cps-spa` (primary), `cps-dotnet` (one controller + Bicep)
**Status:** ~~Approved through brainstorming; ready for implementation planning~~ **Superseded 2026-05-26.**

---

## Goal

Add Azure AD B2C as a co-equal staff login path in `cps-spa` alongside the existing email+password flow. Both paths produce a token that the backend accepts via its existing `B2COrApiKey` policy scheme. Users (or their org admins) choose which path to use; an org admin can later set `EnforceSso=true` on their `SSOConfiguration` to mandate SSO, at which point both the B2C path (already enforced via `B2CValidateController`) and the local password path (new behavior, this spec) reject non-SSO logins with HTTP 409.

The family/patient portal (`PortalAuthContext`, `cps_portal_token`, backend `FamilyJwt` scheme) is **explicitly out of scope** — different audience, different threat model.

---

## Section 1: Architecture Overview

### What changes

- `cps-spa` staff login gets a second path: Azure AD B2C via MSAL.js (`@azure/msal-browser` + `@azure/msal-react`). User picks "Sign in with company SSO" or "Sign in with email" on `/login`.
- `AuthContext` is rewritten to wrap `MsalProvider` and own both paths behind a single `authMode: 'sso' | 'local'` discriminator. One token in memory at a time.
- `apiClient` switches from reading `sessionStorage['cps_token']` directly to calling `getAccessToken()` — a module-scoped accessor that the new `AuthContext` registers on mount. For SSO mode it returns `acquireTokenSilent()`'s result; for local mode it returns the cached CPS JWT.
- Backend gets one focused change: `POST /api/v2/auth/login` (local password) starts enforcing `EnforceSso` — if the user's org has SSO enforced, return the same 409 the B2C path returns. Closes the bypass that would exist if both paths coexisted unguarded.
- New Bicep module under `cps-dotnet/infra/b2c/` provisions B2C app registrations + API scope + key-vault secret. A runbook accompanies the Bicep for the manual steps Bicep can't do (tenant creation, IEF custom policy upload).

### What does NOT change

- Family/patient portal (`PortalAuthContext`, `cps_portal_token`, FamilyJwt backend scheme).
- Next.js `cps` app (its dual-auth cleanup is a separate spec).
- `DevBypassAuthHandler` on the backend.
- `B2CValidateController` itself — already correct; we just rely on it.
- All non-auth functionality and all `/api/v2/*` endpoints — same Bearer-header contract on both sides of the cutover.

### Boundary diagram

```
User -> /login (cps-spa) -> chooses SSO ----> MSAL redirect to B2C -----+
                          \                    (B2C calls /b2c-validate)|
                           +-> local password -> POST /auth/login ------|
                                                                        v
                                                            in-memory access token
                                                                        |
                                                            apiClient.getAccessToken()
                                                                        |
                                                                        v
                                                       Backend B2COrApiKey policy scheme
                                                       -> B2C JWT handler OR local-JWT handler
```

---

## Section 2: Components & File Inventory

### New files (cps-spa)

| File | Purpose |
|---|---|
| `src/auth/msalConfig.ts` | MSAL `Configuration` factory + `loginRequest` scopes. Reads `import.meta.env.VITE_B2C_*`. Mirrors the cps `msal-config.ts` shape so env-var conventions stay consistent across repos. |
| `src/auth/getAccessToken.ts` | Module-scoped `getAccessToken()` + `setAccessTokenProvider(fn)` accessor pair. `AuthContext` registers its provider on mount; `apiClient` calls `getAccessToken()` in the request interceptor. Decouples axios from React state. |
| `src/auth/ssoAcquire.ts` | Thin wrapper around MSAL's `acquireTokenSilent` with `acquireTokenRedirect` fallback on `InteractionRequiredAuthError`. |
| `src/auth/claims.ts` | `parseCpsClaims(token: string): UserInfo` — extracts `userId / organizationId / rbac_role` from JWT payload. Works for both B2C (`extension_*` claims emitted by the custom policy via `B2CValidateController`) and CPS-native JWTs. Replaces inline `decodeToken`. |
| `src/auth/errors.ts` | Exports `SsoRequiredError`, `CredentialError`, `MalformedTokenError`. |
| `src/auth/SsoButton.tsx` | "Sign in with company SSO" button; calls `loginWithSSO()`. Disabled with tooltip when `VITE_B2C_CLIENT_ID` is unset. Lives in `src/auth/` (not `src/pages/`) because it's tied to auth logic, not page composition. |
| `src/auth/__tests__/msalConfig.test.ts` | Env-var parsing, authority URL composition, `knownAuthorities`. |
| `src/auth/__tests__/ssoAcquire.test.ts` | Silent-then-redirect fallback paths. |
| `src/auth/__tests__/claims.test.ts` | Claim extraction from both B2C-shaped and CPS-native JWT payloads. |
| `src/auth/__tests__/getAccessToken.test.ts` | Provider registration + null-when-unset semantics. |
| `src/auth/__tests__/fakes/msal.ts` | `createFakePca({ accounts, tokenResponses })` helper implementing the `IPublicClientApplication` surface that AuthContext + ssoAcquire touch. |
| `src/auth/__tests__/SsoButton.test.tsx` | New; verifies click triggers `loginWithSSO()`; disabled state when `VITE_B2C_CLIENT_ID` is unset. |

### Modified files (cps-spa)

| File | Change |
|---|---|
| `src/auth/AuthContext.tsx` | Wraps `MsalProvider`. Exposes `auth`, `loginWithSSO()`, `loginWithPassword(email, pw)`, `logout()`. Adds `authMode: 'sso' \| 'local'` to `AuthState`. Registers `getAccessToken` provider on mount. Accepts optional `pca?: IPublicClientApplication` prop (defaults to real MSAL instance) for test injection. |
| `src/auth/useAuth.ts` | Adds `loginWithSSO` and `authMode` to the destructured return; type updates only. |
| `src/auth/ProtectedRoute.tsx` | No behavior change. Still checks `auth.isAuthenticated`. |
| `src/api/client.ts` | Replaces direct `sessionStorage.getItem('cps_token')` with `await getAccessToken()`. Request interceptor becomes async. On 401: calls `logout()` for the current `authMode`, then `window.location.href = '/login?reason=expired'`. |
| `src/pages/Login.tsx` | Renders existing email/password form plus new `SsoButton` separated by a divider. Mounts under the same `/login` route. Reads `?reason=expired` and `?reason=invalid_token` query params and shows the corresponding banner. |
| `src/App.tsx` | Removes any direct sessionStorage reads if present. AuthProvider stays at root. |
| `package.json` | Adds `@azure/msal-browser` + `@azure/msal-react` runtime deps. |
| `src/auth/__tests__/AuthContext.test.tsx` | Updated for new shape; adds SSO-path tests using the fake PCA. |
| `src/api/__tests__/client.test.ts` | Replaces `sessionStorage.setItem('cps_token', ...)` setup with `setAccessTokenProvider(() => 'test.token')`. |
| `src/__tests__/App.test.tsx` | Same accessor-injection pattern for the existing role-routing tests. |
| `.env.example` | Add the six `VITE_B2C_*` env vars with documented defaults. |

### Modified files (cps-dotnet)

| File | Change |
|---|---|
| `src/CPS.Api/Controllers/Auth/AuthController.cs` | `Login(email, password)` handler: after credentials validate, look up `SSOConfiguration` by org id; if `IsActive && EnforceSso` → return 409 with the verbatim `userMessage` `B2CValidateController` uses. Adds `ISSOConfigurationRepository` to constructor. |
| `tests/CPS.Api.Tests/AuthControllerEnforceSsoTests.cs` *(new file under existing test project)* | Three cases: EnforceSso=true returns 409; EnforceSso=false returns 200; no SSOConfiguration row returns 200. |

### New files (cps-dotnet)

| File | Purpose |
|---|---|
| `infra/b2c/main.bicep` | Top-level Bicep module; params + module wiring. |
| `infra/b2c/app-registration-api.bicep` | API app registration; exposes `cps-api/access_as_user` scope. |
| `infra/b2c/app-registration-spa.bicep` | SPA-type registration (PKCE-only, no client secret); redirect URIs per env. |
| `infra/b2c/api-key-secret.bicep` | `X-B2C-Api-Key` in Key Vault with 90-day rotation policy. |
| `infra/b2c/parameters/dev.bicepparam` | Per-env params. |
| `infra/b2c/parameters/staging.bicepparam` | |
| `infra/b2c/parameters/prod.bicepparam` | |
| `infra/b2c/custom-policy-trustframework/TrustFrameworkBase.xml` | IEF starter pack base (unmodified). |
| `infra/b2c/custom-policy-trustframework/TrustFrameworkExtensions.xml` | CPS-specific extension: `REST-CpsValidate` technical profile calling `${cpsApiBaseUrl}/api/v2/auth/b2c-validate`. |
| `infra/b2c/custom-policy-trustframework/SignUpOrSignin.xml` | User journey orchestrating REST call → claim emission. |
| `infra/b2c/replace-placeholders.ps1` | Substitutes `{TenantName}` + `{cpsApiBaseUrl}` and writes resolved XML to `./out/{env}/`. |
| `infra/b2c/README.md` | The runbook (12 numbered steps). |

---

## Section 3: Data Flow

### Flow 1 — SSO login (happy path)

1. User visits `/login`, clicks "Sign in with company SSO" (`SsoButton`).
2. `loginWithSSO()` calls `msalInstance.loginRedirect(loginRequest)`. Browser leaves the SPA.
3. B2C runs the SignUpOrSignin custom policy. As part of the policy, B2C makes a server-to-server `POST` to `/api/v2/auth/b2c-validate` with the user's email and the `X-B2C-Api-Key` shared secret. `B2CValidateController` returns `{ userId, organizationId, rbacRoles, permissions }` or a 409.
4. B2C embeds those values as claims (`extension_userId`, `extension_organizationId`, `extension_rbac_role`, `extension_permissions`) in the access token.
5. B2C redirects back to `redirectUri` (`/auth/callback`) with the authorization code; MSAL exchanges it for tokens.
6. SPA boots back up, `MsalProvider` fires `EventType.LOGIN_SUCCESS`. AuthContext catches it, calls `ssoAcquire.getToken()` once, parses claims via `claims.ts`, sets `authState = { isAuthenticated: true, authMode: 'sso', user }`, navigates to `/`.
7. Every subsequent API call hits the apiClient interceptor → `getAccessToken()` → MSAL `acquireTokenSilent()` (cached, in-memory) → attached as `Authorization: Bearer <b2c-token>`. Backend's `B2COrApiKey` policy scheme routes to the `B2C` JWT handler (Microsoft.Identity.Web).

### Flow 2 — Local password login (happy path)

1. User visits `/login`, fills email + password, submits.
2. `loginWithPassword(email, pw)` POSTs `/api/v2/auth/login`. Backend validates credentials, then checks `SSOConfiguration.EnforceSso` for the user's org (new behavior).
3. If `EnforceSso=true`: backend returns 409 with `{ userMessage: "This organization requires SSO login..." }`. AuthContext surfaces the message; user clicks SsoButton instead.
4. Otherwise: backend returns `{ data: { token } }`. AuthContext stores it in `sessionStorage['cps_token']`, parses claims via the same `claims.ts`, sets `authState = { isAuthenticated: true, authMode: 'local', user }`.
5. Subsequent API calls: interceptor → `getAccessToken()` → returns the cached local JWT → backend's policy scheme routes to the local JWT handler.

### Flow 3 — Token attachment & refresh

- `apiClient` request interceptor is async: `async (config) => { const token = await getAccessToken(); if (token) config.headers.set('Authorization', \`Bearer ${token}\`); return config; }`. Axios supports async interceptors.
- SSO mode: `acquireTokenSilent` returns the cached token or refreshes via the B2C refresh-token cookie. On `InteractionRequiredAuthError`, `ssoAcquire` falls back to `acquireTokenRedirect()`. State is preserved by MSAL's `state` parameter.
- Local mode: returns the in-memory CPS JWT. No refresh — local JWTs expire and the user must log in again (existing behavior; not regressing).

### Flow 4 — Logout

- `logout()` branches on `authMode`:
  - `sso`: `msalInstance.logoutRedirect({ postLogoutRedirectUri: '/login' })` — clears MSAL cache and bounces through B2C's logout endpoint.
  - `local`: removes `cps_token` from sessionStorage, clears AuthContext state, navigates to `/login`.
- In both cases, the in-memory token is cleared and `getAccessToken()` returns `null` thereafter.

### Flow 5 — 401 from API

- Response interceptor catches 401. It does **not** try to recover (no retry-with-refresh loop — silent acquisition already happened at request time).
- Calls `logout()` for the current `authMode`, then `window.location.href = '/login?reason=expired'`.
- `/login` reads `?reason=expired` and shows "Your session ended. Please sign in again."

### Flow 6 — Page reload / cold boot

- SSO mode: MSAL reads its cache from `sessionStorage` (per `msalConfig.cache.cacheLocation`); if an account is present and silent token works, AuthContext rehydrates with `authMode: 'sso'`.
- Local mode: AuthContext reads `cps_token` from sessionStorage (existing behavior).
- If both are present (transitional bug state), **SSO wins** — AuthContext picks SSO first, clears the local token to avoid drift.

---

## Section 4: Backend Changes

### `AuthController.Login` honors `EnforceSso`

The local password path currently authenticates anyone with valid credentials. Once both paths coexist, an org admin who flips `EnforceSso=true` could still have users bypass it via `POST /api/v2/auth/login`. We close that loophole.

```text
POST /api/v2/auth/login { email, password }
  validate credentials -> if invalid: 401 (existing)
  load user.OrganizationId
  if OrganizationId is not null:
      ssoConf = await ssoConfig.GetByOrganizationIdAsync(orgId)
      if ssoConf is { IsActive: true, EnforceSso: true }:
          return StatusCode(409, new {
              version = "1.0.0",
              status = 409,
              userMessage = "This organization requires SSO login. Please use your organization's single sign-on portal.",
          })
  issue local CPS JWT (existing)
```

The 409 response shape and `userMessage` are copied verbatim from `B2CValidateController` so the SPA can render both rejections with one component.

- **Why 409, not 403:** matches the existing `B2CValidateController` convention. Same status code → one SPA handler.
- **Why the org-id null guard:** newly-self-signed-up users with no org have nothing to enforce; they complete local login normally (preserves the onboarding flow).
- **DI:** `AuthController` adds `ISSOConfigurationRepository` to its constructor. No new services.

### No other backend changes

- `Program.cs` auth wiring — unchanged.
- `DevBypassAuthHandler` — unchanged.
- `B2CValidateController` — unchanged.
- `B2CMigrationService` — out of scope here; runs as a separate operational task when migrating existing users into B2C.

### Tests

- New: `AuthControllerEnforceSsoTests` — three cases (EnforceSso=true → 409; EnforceSso=false → 200; no `SSOConfiguration` row → 200).
- Existing `AuthController` test fixtures keep passing (case 3 covers fixtures that don't seed an SSO config).

---

## Section 5: Azure Infrastructure (Bicep + Runbook)

### Reality check on what Bicep can and can't do for B2C

Bicep + ARM cover Azure resources. They do NOT cover:

- Creating the B2C tenant itself (portal click-through; the tenant is a separate Azure AD directory).
- Uploading IEF custom policy XML (done via `Microsoft.Graph trustFrameworkPolicy` endpoints).
- Creating user flows (portal click-through).

So this section is split: **Bicep for what it can do** + a **runbook** for the manual + Graph-API pieces.

### 5.1 Bicep layout (`cps-dotnet/infra/b2c/`)

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

**`main.bicep` parameters:**

- `tenantId` — the B2C tenant GUID (created manually first)
- `environment` — `dev` | `staging` | `prod`
- `spaRedirectUris` — array; differs per env
- `apiAppName`, `spaAppName`
- `keyVaultName` — where `X-B2C-Api-Key` rotates
- `cpsApiBaseUrl` — used by custom policy to call `/api/v2/auth/b2c-validate`

**`app-registration-api.bicep`:** creates the API app registration. Exposes one scope: `cps-api/access_as_user`. App ID URI: `https://{tenantName}.onmicrosoft.com/cps-api`.

**`app-registration-spa.bicep`:** creates a SPA-type (PKCE-only, no client secret) registration. Adds redirect URIs from `spaRedirectUris`. Grants admin consent to `cps-api/access_as_user`. Outputs the `clientId` for `VITE_B2C_CLIENT_ID`.

**`api-key-secret.bicep`:** stores the `X-B2C-Api-Key` shared secret in Key Vault. Includes a `rotationPolicy` set to 90 days. cps-dotnet's `B2CValidation:ApiKey` config reads from Key Vault via existing app-config wiring.

### 5.2 Custom policy XML

Three IEF policy files, version controlled:

- **`TrustFrameworkBase.xml`** — standard Microsoft starter pack, unchanged.
- **`TrustFrameworkExtensions.xml`** — CPS-specific. Adds the `REST-CpsValidate` technical profile that calls `${cpsApiBaseUrl}/api/v2/auth/b2c-validate` with header `X-B2C-Api-Key={SettingsSecret:CpsValidateApiKey}` and maps response fields (`userId`, `organizationId`, `rbacRoles`, `permissions`) into output claims with names matching the SPA's `claims.ts` parser.
- **`SignUpOrSignin.xml`** — orchestration steps: collect email → call `REST-CpsValidate` → on 409, surface `userMessage` and end journey; on 200, issue token with enriched claims.

These XMLs reference `${TenantName}` and `${cpsApiBaseUrl}` placeholders. `replace-placeholders.ps1` substitutes them per env.

### 5.3 Runbook (`infra/b2c/README.md`)

Twelve numbered steps, each with the exact command:

1. **Create B2C tenant** (portal).
2. **Link tenant to subscription** (portal).
3. **Switch directory context** — `az login --tenant {b2c-tenant-guid}`.
4. **Deploy Bicep app registrations** — `az deployment group create --template-file main.bicep --parameters parameters/{env}.bicepparam`.
5. **Generate `X-B2C-Api-Key` + store in Key Vault** — `az keyvault secret set ...`. Update cps-dotnet app config to read from Key Vault.
6. **Substitute placeholders in policy XML** — `pwsh ./replace-placeholders.ps1 -Env {env}`.
7. **Upload custom policies via Graph** — order matters: Base → Extensions → SignUpOrSignin. `az rest --method PUT --url 'https://graph.microsoft.com/beta/trustFramework/policies/B2C_1A_TrustFrameworkBase/$value' --body @TrustFrameworkBase.xml`. Repeat for the others.
8. **Add IEF apps + signing/encryption keys** (portal: `IdentityExperienceFramework` + `ProxyIdentityExperienceFramework` apps; `TokenSigningKeyContainer` + `TokenEncryptionKeyContainer`).
9. **Smoke test the user journey** — portal: Custom policies → `B2C_1A_signup_signin` → Run now. Confirm B2C calls `/b2c-validate` and the resulting token contains the four `extension_*` claims.
10. **Plumb env vars into SPA build** — add `VITE_B2C_*` to the SPA's deployment pipeline. Document in `cps-spa/.env.example`.
11. **Provision a B2C dev tenant separately** — same Bicep + same runbook, different `dev.bicepparam`. Required for SPA dev work against real SSO.
12. **Document `X-B2C-Api-Key` 90-day rotation** — update Key Vault secret → update policy `Settings.CpsValidateApiKey` (Graph call) → rolling restart of cps-dotnet.

### Explicitly not automated

B2C tenant creation, IEF app + key creation, and the first-time portal click to grant admin consent on the SPA registration. These are one-time-per-tenant manual steps; automating them with Graph would be more brittle than the click-through.

---

## Section 6: Error Handling

### Taxonomy

| # | Source | Trigger | UI | Recovery |
|---|---|---|---|---|
| 1 | B2C policy | User not provisioned in CPS (`B2CValidateController` 409 + `userMessage`) | B2C displays `userMessage` on its own error page; offers "Return to {AppName}" link to `/login` | User contacts org admin (or admin uses invite flow); user retries. |
| 2 | B2C policy | User's org has `EnforceSso=true` but came via wrong identity provider | Same as #1, with SSO-required `userMessage` | User logs in via org SSO. |
| 3 | Backend `AuthController.Login` (new) | User's org has `EnforceSso=true` and user tried password login | 409 → `loginWithPassword` throws `SsoRequiredError(userMessage)`. Login page renders inline banner above the form: `{userMessage}` + primary CTA "Sign in with company SSO" → `loginWithSSO()` | One click. |
| 4 | MSAL (interactive) | User cancels B2C login, closes window, network drop during redirect | MSAL `BrowserAuthError` caught in `loginWithSSO()`. AuthContext stays unauthenticated; non-blocking toast: "Sign-in cancelled" | User clicks SsoButton again. |
| 5 | MSAL (silent acquire) | `acquireTokenSilent` → `InteractionRequiredAuthError` | `ssoAcquire` calls `acquireTokenRedirect()`. State preserved by MSAL `state` param | Automatic; user bounces through B2C and lands back on the SPA. |
| 6 | apiClient | 401 from any API call | Interceptor calls `logout()` for current `authMode`, then `window.location.href = '/login?reason=expired'`. `/login` reads `?reason=expired` and shows "Your session ended. Please sign in again." | User signs in. |
| 7 | Claims parser | Token present but `claims.ts` can't extract `userId` | `parseCpsClaims` throws `MalformedTokenError`. AuthContext clears state, logs error to console with `iss` claim only (no PII), redirects to `/login?reason=invalid_token` | Sysadmin investigates (likely policy misconfig); user retries. |

### Error types (`src/auth/errors.ts`)

```ts
class SsoRequiredError extends Error { constructor(readonly userMessage: string) { ... } }
class CredentialError extends Error {}                   // 401 from /auth/login
class MalformedTokenError extends Error {}               // claims.ts parse failure
```

`loginWithPassword` throws one of these; the Login page renders accordingly. `loginWithSSO` doesn't throw user-facing errors — MSAL handles its own redirects.

### Logging discipline

Auth errors never log the bearer token, password, or full JWT payload. They log: error class name, `iss` claim, HTTP status (if applicable), and the route the failure happened on. Backend's audit-anomaly pipeline (PR #118) already watches `B2CValidateController` 409s; extend the same query to watch `AuthController.Login` 409s.

### Non-obvious decision: no retry-with-refresh on 401

MSAL already exhausted silent acquisition before the request went out (`getAccessToken` in apiClient awaits `acquireTokenSilent`). If a 401 still comes back, the token was valid-format but rejected (revoked, claims mismatch, org-key rotation) — retrying would only loop. Logout + redirect is the only correct response.

### Explicitly NOT handled

- Multi-tab logout sync (BroadcastChannel) — deferred.
- Step-up auth (MFA mid-session) — already handled naturally by `InteractionRequiredAuthError` (category #5).
- Offline / network failures during login — browser shows its own error page.

---

## Section 7: Testing Strategy

### Test pyramid

- **Unit (vitest, jsdom)** — most coverage; pure functions + isolated React components with mocked MSAL.
- **Integration (vitest)** — `AuthContext` + `apiClient` + `Login` page composed; MSAL stubbed; backend mocked via `msw`.
- **End-to-end** — out of scope for this spec. Real B2C E2E requires a live dev tenant + Playwright; `cps-validator` could absorb this later as a Phase 4 scenario.

### MSAL mocking — chosen approach: inject a fake `PublicClientApplication`

`createFakePca({ accounts, tokenResponses })` helper in `src/auth/__tests__/fakes/msal.ts` implements just the surface AuthContext touches: `loginRedirect`, `logoutRedirect`, `acquireTokenSilent`, `acquireTokenRedirect`, `getAllAccounts`, `addEventCallback`, `handleRedirectPromise`, `initialize`.

AuthContext accepts an optional `pca?: IPublicClientApplication` prop, defaulting to the real instance. Tests pass the fake. No `vi.mock` of MSAL itself — keeps test setup readable and lets type-checking catch surface drift.

### Test inventory (cps-spa)

| File | Coverage |
|---|---|
| `src/auth/__tests__/msalConfig.test.ts` | Env-var parsing; authority URL composition; `knownAuthorities`; missing env vars fall through to safe defaults |
| `src/auth/__tests__/claims.test.ts` | Extract `userId/organizationId/rbac_role` from B2C `extension_*` tokens; same from CPS-native tokens; throws `MalformedTokenError` on missing `userId` |
| `src/auth/__tests__/ssoAcquire.test.ts` | `acquireTokenSilent` cached returns; `InteractionRequiredAuthError` → `acquireTokenRedirect` once; other errors propagate |
| `src/auth/__tests__/getAccessToken.test.ts` | `setAccessTokenProvider` registers; `getAccessToken` returns null when no provider; returns provider value when set |
| `src/auth/__tests__/AuthContext.test.tsx` | Seven cases: (1) `loginWithSSO` calls `loginRedirect` with `loginRequest` scopes; (2) `LOGIN_SUCCESS` hydrates `authState.authMode='sso'`; (3) `loginWithPassword` happy path sets `authMode='local'` + writes `cps_token`; (4) `loginWithPassword` 409 throws `SsoRequiredError(userMessage)`; (5) `logout` in SSO mode calls `logoutRedirect`; (6) `logout` in local mode clears sessionStorage; (7) cold-boot prefers SSO when both are present, clears local token |
| `src/auth/__tests__/ProtectedRoute.test.tsx` | Redirects to `/login` when unauthenticated; renders children when authenticated — covers both `authMode` values |
| `src/api/__tests__/client.test.ts` | Interceptor calls `getAccessToken()` (not sessionStorage directly); 401 calls `logout()` then navigates; works for both `authMode` modes via accessor abstraction |
| `src/pages/__tests__/Login.test.tsx` | (augmented; file already exists) Renders both SsoButton and email/password form; SsoButton click triggers `loginWithSSO`; password submit calls `loginWithPassword`; `SsoRequiredError` renders inline banner with SSO CTA; `?reason=expired` query param renders the "Your session ended" banner |
| `src/__tests__/App.test.tsx` | Existing role-routing tests use `setAccessTokenProvider(() => testToken)` instead of `sessionStorage.setItem('cps_token', ...)` |

### Test inventory (cps-dotnet)

| File | Coverage |
|---|---|
| `tests/CPS.Api.Tests/AuthControllerEnforceSsoTests.cs` | Three cases per Section 4 |

### Bicep test posture

- `infra/b2c/*.bicep` get an `az deployment group what-if` in CI against the dev tenant. Fails the PR if it would change resources outside the b2c resource group.
- Policy XML files get a basic well-formedness lint (`xmllint --noout`) in CI. No semantic validation — runbook step 9 is the only meaningful test of policy logic.

### Explicitly skipped

- MSAL internal flow tests (PKCE, refresh endpoint, etc.) — MSAL's responsibility.
- B2C policy execution in CI — no way to run IEF policy outside a live tenant.
- Snapshot tests of Login page rendering — structural assertions only.
- Cross-browser MSAL behavior — vitest+jsdom is sufficient for our logic.

### Coverage target

Same as the rest of cps-spa (no formal threshold; convention is "every public function in `src/auth/` and every branch in `apiClient` has a test"). The inventory above achieves that.

---

## Section 8: Rollout & Dev Experience

### Rollout sequence (each step independently revertable)

1. **Backend `EnforceSso` enforcement on `/auth/login`.** Ship alone. Zero SPA impact until an org sets `EnforceSso=true`. Lets us verify the 409 contract in isolation.
2. **`cps-spa` SSO scaffolding (no UI yet).** MSAL deps, `msalConfig`, `getAccessToken`, `ssoAcquire`, `claims`, `errors`. `AuthContext` refactored to use the accessor + `MsalProvider` wrapper, **but `SsoButton` not rendered yet**. `authMode` defaults to `local`. Existing email/password works unchanged. Safe to merge with no B2C tenant.
3. **B2C tenant + Bicep + custom policy upload (dev only).** Runbook steps 1–9 against a fresh dev B2C tenant. Smoke-test in the portal. No SPA changes in this step.
4. **`cps-spa` SsoButton + Login integration.** Add `SsoButton`, banner-on-`SsoRequiredError`, env vars to `.env.example` + dev deployment. Real SSO login works end-to-end in dev.
5. **Staging B2C tenant + Bicep + staging SPA deploy.** First realistic exercise; expect tenant config bugs to surface here.
6. **Pilot one prod org with `EnforceSso=false`.** Set `IsActive=true`, leave `EnforceSso=false`. Users see SsoButton; can use it or password. Run for one week minimum; monitor 409 rates.
7. **Pilot org flips to `EnforceSso=true`.** First time the EnforceSso loop closes in prod.
8. **Open up to all prod orgs.** Each org's admin sets their own `EnforceSso` when ready. Capability now exists for any org; full retirement of local password login is a follow-on spec.

### Dev experience after the cutover

| Scenario | What dev does |
|---|---|
| Local dev, no Azure access | `Auth:DevBypass:Enabled=true` on cps-dotnet (existing). SPA `/login` shows both forms; password works against dev seed; SsoButton greyed out with tooltip "B2C not configured in this environment" unless `VITE_B2C_CLIENT_ID` is set. |
| Local dev, want to test real SSO | Set `VITE_B2C_*` to dev B2C tenant. Click SsoButton. Full round-trip works against local cps-dotnet. |
| CI / vitest | MSAL replaced by `createFakePca`. No tenant needed. |
| `cps-validator` smoke tests | Untouched. Use `Auth:DevBypass` and don't need MSAL. (The Phase 3 OIDC twin in cps-validator is for the backend's OIDC SSO callback — separate concern.) |

### Env-var inventory (cps-spa)

```text
VITE_B2C_CLIENT_ID         # SPA app registration client ID (from Bicep output)
VITE_B2C_INSTANCE          # https://{tenantName}.b2clogin.com/tfp/
VITE_B2C_DOMAIN            # {tenantName}.onmicrosoft.com
VITE_B2C_SUSI_POLICY       # B2C_1A_signup_signin
VITE_B2C_REDIRECT_URI      # /auth/callback (or full URL per env)
VITE_B2C_API_SCOPE         # https://{tenant}/cps-api/access_as_user
```

All six get documented defaults in `.env.example` plus an `if (!import.meta.env.VITE_B2C_CLIENT_ID)` guard that disables SsoButton with the tooltip above. Missing env vars are a soft fail, not a hard error — local dev without B2C still boots.

### Feature flags / observability

- No new feature flags (we chose "keep both, no flag").
- Audit-anomaly pipeline (PR #118) already watches `B2CValidateController` 409s; extend in step 6 to watch `AuthController.Login` 409s too. Spike = SSO config drift.
- One new structured log on cps-spa: `console.info('[auth] login success', { mode })` — one line, one field, no PII.
- Existing `MalformedTokenError` console logging covers failures.

### Rollback per step

| Step | Rollback |
|---|---|
| 1 (backend EnforceSso) | Revert PR. The 409 check was the only change. |
| 2 (SPA scaffolding) | Revert PR. `authMode` defaulted to `local`; pre-cutover behavior restored. |
| 3 (dev B2C tenant) | Delete the tenant. No code changes to back out. |
| 4 (SsoButton wired) | Revert PR. SsoButton disappears; password login keeps working. |
| 5 (staging B2C) | Same as 3. |
| 6 (pilot org, EnforceSso=false) | Set `IsActive=false` on that org's `SSOConfiguration`. |
| 7 (pilot org, EnforceSso=true) | Flip `EnforceSso` back to `false`. |
| 8 (broad rollout) | Each org independently revertable via 6/7. |

---

## Open Questions

None at spec-approval time. All design decisions made in brainstorming are documented above.

## Out of Scope (Future Specs)

- Retire the local password endpoint entirely (separate spec, after all orgs are on SSO).
- Next.js `cps` dual-auth cleanup (separate spec).
- `B2CMigrationService` operational runbook for migrating existing users into B2C (operational task, not a code spec).
- BroadcastChannel-based multi-tab logout sync (deferred unless requested).
- E2E SSO scenarios in `cps-validator` (Phase 4 candidate).

---

## References

- Backend B2C entry point: `cps-dotnet/src/CPS.Api/Controllers/Auth/B2CValidateController.cs`
- Existing MSAL config in Next.js cps: `cps/src/lib/msal-config.ts` (env-var naming inspiration)
- Existing Bicep convention: `cps-dotnet/infra/functions/*.bicep`
- Migration plan: `cps/docs/dotnet-migration-plan.md` (Phase 3 auth migration)
- SSO completion spec (precedent): `cps-dotnet/docs/superpowers/specs/2026-05-13-sso-completion-design.md`
- Audit anomaly pipeline used for observability: PR #118
- DevBypassAuthHandler used for non-prod dev: PR #130
