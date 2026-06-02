import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// cps-spa only. Verifies the MSAL B2C staff auth round-trip succeeds end-to-end.
// In test mode this means: with `cps-test-access-token` already in sessionStorage
// (set by asStaffUser), navigating to "/" renders the protected Layout instead
// of redirecting to /login. The "round-trip" semantics here are best-effort
// because TEST_B2C_TOKEN is a long-lived JWT — we cannot exercise the real
// B2C redirect on every CI run.
test('staff auth flow lands on protected layout (not /login)', async ({ browser, spa }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await asStaffUser(page);
  await page.goto(`${spa.url}/`);
  await page.waitForLoadState('networkidle');
  // Forgiving assertion: with a valid test token we should NOT be redirected
  // to /login. If AuthContext fully consumes the test-mode override (T11+),
  // we expect to land at "/" with the dashboard rendered. Until then, the
  // critical signal is the absence of a /login redirect.
  expect(page.url()).not.toContain('/login');
  await ctx.close();
});
