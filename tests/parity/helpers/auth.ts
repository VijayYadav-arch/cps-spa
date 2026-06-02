// @ts-nocheck -- `process.env` access requires @types/node (absent from this Vite/browser project).
// Playwright's runner provides a node context; esbuild compiles this file without TS type-checking.
import type { Page } from '@playwright/test';

/**
 * Pre-stages a staff session by injecting a test B2C access token into MSAL's
 * localStorage cache. Bypasses the full B2C redirect flow for test speed.
 *
 * Requires the TEST_B2C_TOKEN env var holding a long-lived JWT from a test B2C
 * tenant or a dedicated E2E B2C account.
 *
 * Implementation note: the exact MSAL localStorage key shape depends on
 * @azure/msal-browser version 3.x. The keys are constructed as:
 *   msal.account.keys = JSON.stringify([<homeAccountId>])
 *   <homeAccountId> = JSON.stringify({ homeAccountId, environment, tenantId, ... })
 *   <key-for-accesstoken> = JSON.stringify({ secret, expiresOn, ... })
 *
 * For tests, simpler approach: inject the token into a known sessionStorage key
 * that cps-spa's AuthContext can read as a test-mode override. This requires a
 * `VITE_TEST_AUTH_OVERRIDE=true` env var on the cps-spa preview AND a small
 * code path in AuthContext that reads `sessionStorage['cps-test-access-token']`
 * when that env var is set. The implementer adds this AuthContext override in T11
 * or in this task's complement.
 *
 * For NOW (T7), this helper just sets the sessionStorage key. AuthContext
 * consumption is wired later. Tests that depend on real auth will fail until
 * that wiring lands.
 */
export async function asStaffUser(page: Page, _opts?: { roles?: string[] }): Promise<void> {
  const token = process.env.TEST_B2C_TOKEN;
  if (!token) {
    throw new Error(
      'TEST_B2C_TOKEN env var required for staff parity tests. ' +
      'Set this in the CI environment with a long-lived test B2C token.'
    );
  }
  await page.goto('/');
  await page.evaluate((t) => {
    sessionStorage.setItem('cps-test-access-token', t);
  }, token);
  await page.reload();
}

/**
 * Pre-stages a family-member session by POSTing to the family login endpoint
 * (proxied to cps-dotnet's FamilyJwt scheme) and injecting the returned JWT
 * into sessionStorage under the cps-family-token key.
 */
export async function asFamilyMember(page: Page, opts: { patientId: number; pin: string }): Promise<void> {
  await page.goto('/');
  const token = await page.evaluate(async ({ patientId, pin }) => {
    const res = await fetch('/api/family/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, pin }),
    });
    if (!res.ok) throw new Error(`family login failed: ${res.status}`);
    const data = await res.json();
    sessionStorage.setItem('cps-family-token', data.token);
    return data.token;
  }, opts);
  if (!token) throw new Error('family login did not return a token');
  await page.reload();
}
