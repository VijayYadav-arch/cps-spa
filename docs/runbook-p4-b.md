# P4-B Runbook

## What this is

cps-spa absorbs all authenticated app surfaces from cps Next.js. Family / clinician / commercial portals plus the 56 admin pages now live in cps-spa. cps Next.js retains marketing-only routes.

## Auth shapes

| User type | Scheme | Storage |
|---|---|---|
| Staff (admin / clinician / commercial portal) | MSAL B2C access token | MSAL cache in localStorage |
| Patient (self-service portal) | Custom JWT | `sessionStorage['cps-portal-token']` |
| Family member | FamilyJwt | `sessionStorage['cps-family-token']` |

`PortalAuthProvider` is mounted in `App.tsx` (between `AuthProvider` and `BrowserRouter`) so `usePortalAuth()` is available to family-portal pages AND the orphaned patient-self-service pages. Staff MSAL auth is handled by `AuthProvider` and is unaffected.

## How role gating works

1. cps-spa `AuthContext` fires after MSAL login (staff) or `loginAsFamily()` (family).
2. `useUserRoles` fetches `/api/v2/me` once, cached in TanStack Query for 5 minutes.
3. `<RoleRoute required={...}>` checks `usePermission()` before rendering; redirects to `/unauthorized` on miss.
4. `<PermissionGuard required={...}>` hides UI elements per permission. **Phase C status**: in-page submit/delete-button retrofit is deferred to a follow-up PR. Route-level guards are live for security-sensitive routes (see App.tsx).
5. On 401 / 403 from any API call, the axios interceptor handles per-instance.

## Diagnostics

- "User sees `/unauthorized` for a page they should access" → run `/api/v2/me` on the test environment via curl with their token; check the returned `permissions[]` array.
- "Staff and family sessions interfere" → check sessionStorage in DevTools for both keys (`cps-family-token` vs MSAL cache under `msal.account.keys`). They should coexist independently.
- "Family login fails" → cps-dotnet `/family-api/auth/login` is the gate; check the test patient row has an active `FamilyAccess` with a matching PIN hash.

## Rollback (within bake window)

```bash
git -C cps revert <redirect-stubs-commit-sha>
# Each absorbed page goes back to its full Next.js implementation.
# Deploy cps as a hot-fix; cps-spa stays live but receives no production
# traffic for /admin, /family, /clinician, /portal paths.
```

For full rollback after bake (>1 week post-merge):

```bash
git -C cps checkout pre-p4-b-cutover -- src/app/admin src/app/family src/app/clinician src/app/portal
```

## Cross-repo permission sync

`src/permissions/permissions.ts` in cps-spa is hand-mirrored from cps-dotnet's `CPS.Core.Authorization.Permissions` static class. CI sync:

- cps-dotnet test `PermissionsContractExportTests` emits `test-artifacts/permissions.json`
- cps-spa CI downloads it as a build artifact and asserts `permissions.ts` matches
- Drift fails the cps-spa build with a diff between expected (cps-dotnet) and actual (cps-spa)

## Parity tests

48 Playwright parity specs live in `tests/parity/specs/`. They are **compile-only** by default. Running them at runtime requires:

- `TEST_B2C_TOKEN` env var with a long-lived test B2C JWT
- cps Next.js production build running on :3030
- cps-spa Vite preview running on :5173
- cps-dotnet running locally on :5025 (or a routable test environment)
- `data-testid` markers on cps Next.js source pages (mostly TBD — folded into the cps Next.js redirect-stub PR for the few routes where stub-only is sufficient)

Helper limitations to fix in a follow-up:

- `tests/parity/helpers/auth.ts` `asFamilyMember` POSTs to `/api/family/auth/login`; actual endpoint is `/family-api/auth/login`. Update before runtime.
- `asFamilyMember` writes only `cps-family-token`; full session hydration needs `cps-family-expires-at`, `cps-family-patient-id`, `cps-family-access-id` keys too.
- `asStaffUser(page, { roles })` accepts `roles` but doesn't yet plumb them into the AuthContext override — needed for `permissions-unauthorized` / `permissions-guard-hides` / `permissions-roleroute-redirects` runtime.

## Known limitations

- Permission constants are hand-mirrored (no codegen). Each new permission requires a coordinated change in cps-dotnet + cps-spa.
- Family token has no silent refresh; 8 h expiry triggers explicit re-login.
- `compliance/anomalies` route is not yet wrapped in `RoleRoute` — no specific `COMPLIANCE_ANOMALIES` constant exists. Defer to controller-level auth; add a constant in a follow-up.
- T16 replaced the patient-self-service `/portal/*` mount with the commercial portal. Patient portal pages (`PortalDocuments`, `PortalOverview`, etc.) still exist on disk but are routing-orphaned. Re-home under `/patient-portal/*` if needed in a follow-up.
- In-page `<PermissionGuard>` wrapping of submit / delete / sensitive-action buttons across ~50 pages is deferred to Phase C (follow-up PR).
