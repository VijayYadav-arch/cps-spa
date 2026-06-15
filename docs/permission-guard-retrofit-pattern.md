# Permission-guard button retrofit — canonical pattern

Closes the deferred item in `runbook-p4-b.md` (route-level guards exist; in-page
button-level guards were deferred). This adds **button-level** permission gating to
submit / delete / sensitive-action buttons across the SPA.

**Reference implementation:** `src/pages/Claims/ClaimDetail.tsx` +
`src/pages/Claims/__tests__/ClaimDetail.test.tsx`. Mirror those exactly.

## UX decision (locked)

Show-but-disable + tooltip. Do NOT hide buttons.

```tsx
const canSubmit = usePermission(PERMISSIONS.CLAIMS_SUBMIT);
...
<button
  onClick={...}
  disabled={isSubmitting || !canSubmit}   // COMPOSE with any existing disabled state
  title={!canSubmit ? NO_PERMISSION : undefined}
  style={{ ..., cursor: (isSubmitting || !canSubmit) ? 'not-allowed' : 'pointer' }}
>
```

Add once per page, above the return:
```tsx
const NO_PERMISSION = 'You do not have permission to perform this action';
```
(module-level const) and the `usePermission(...)` calls inside the component.

Imports:
```tsx
import { usePermission } from '@/permissions/usePermission';
import { PERMISSIONS } from '@/permissions/permissions';
```

## Which permission? (the mapping rule)

A button's permission = the `[Authorize(Policy = "...")]` on the **backend endpoint
its handler calls**. Trace: button onClick → handler → `@/api/*` function → HTTP path
→ controller action/class in `cps-dotnet/src/CPS.Api/Controllers/**` → its `Policy`.

- The policy string IS the permission literal (e.g. `claims:submit`). Find the matching
  `PERMISSIONS.*` constant in `src/permissions/permissions.ts`.
- **Only use constants that already exist.** The set is frozen — a CI contract test
  (`PermissionsContractExportTests`) fails the build on drift. NEVER invent a constant.
- **Only guard state-changing / export / print actions.** If the endpoint's policy is a
  read/`:view` permission (same as the route guard that already gated the page), do NOT
  add a guard — the user viewing the page already holds it; guarding adds noise.
- Navigation-only buttons (`navigate(...)`, back links) → no guard.
- If a handler hits an endpoint whose policy has no matching `PERMISSIONS.*` constant,
  leave it unguarded and report it (do not invent).

## Test seam (critical)

`usePermission` → `useUserRoles` → `useQuery`. Component tests render without a
QueryClientProvider, so mock the `useUserRoles` seam (real `usePermission` logic still
runs). Add to each page's test file:

```tsx
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue(
    { data: { permissions } } as unknown as ReturnType<typeof useUserRoles>,
  );
}
// in beforeEach, AFTER vi.clearAllMocks(): default to all perms the page uses
// so existing behaviour tests keep seeing enabled buttons.
```

Per guarded button, add two tests: disabled (+ `title` matches `/permission/i`) when the
permission is absent; enabled when present.

## TDD (required)

RED (write failing test, run, watch it fail for the right reason) → GREEN (minimal impl)
→ verify. Run per file:

```bash
SPA=/c/Users/Vijay.Yadav/source/clauderepos/cps-spa
"$SPA/node_modules/.bin/vitest" run --root "$SPA" <relative-test-path>
"$SPA/node_modules/.bin/tsc" --noEmit -p "$SPA/tsconfig.json"   # must exit 0
```
(`cd` is blocked in this environment — invoke the binaries with `--root` as above.)
