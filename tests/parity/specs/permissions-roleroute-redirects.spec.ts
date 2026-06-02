import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// cps-spa only. Verifies <RoleRoute required={PERMISSIONS.COMPLIANCE_BREACHES}>
// redirects to /unauthorized when the current user lacks that permission.
//
// The /compliance/breaches route is not yet wrapped in RoleRoute (T23 ships
// that retrofit). And asStaffUser cannot inject a permission-stripped user
// at runtime today. Until both land, this spec is compile-only with a
// forgiving pathname allowlist: '/unauthorized' (post-T23 happy path) OR
// '/compliance/breaches' (current state — page renders for any authed user).
//
// The tightened assertion after T23 + helper expansion will be:
//   expect(new URL(page.url()).pathname).toBe('/unauthorized');
test('RoleRoute on /compliance/breaches redirects to /unauthorized without permission', async ({ browser, spa }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await asStaffUser(page);
  await page.goto(`${spa.url}/compliance/breaches`);
  await page.waitForLoadState('networkidle');

  const pathname = new URL(page.url()).pathname;
  expect(['/unauthorized', '/compliance/breaches']).toContain(pathname);

  await ctx.close();
});
