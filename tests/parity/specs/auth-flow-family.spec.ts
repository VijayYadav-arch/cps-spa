import { test, expect } from '../fixtures/dual-app';

// cps-spa only. Drives the family login form by hand (not via asFamilyMember
// helper) so we exercise the real PortalAuthContext.loginAsFamily flow:
// POST /api/family/auth/login -> sessionStorage 'cps-family-token' -> navigate
// to /family/dashboard.
test('family auth flow: form submit lands on /family/dashboard with token persisted', async ({ browser, spa }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${spa.url}/family/login`);
  await page.waitForSelector('[data-testid="family-login-title"]');

  await page.fill('[data-testid="family-patient-id-input"]', '1');
  await page.fill('[data-testid="family-pin-input"]', '1234');
  await page.click('[data-testid="family-login-submit"]');

  // Wait until either we land on /family/dashboard or an error surfaces.
  await page.waitForLoadState('networkidle');
  expect(page.url()).toContain('/family/dashboard');

  const token = await page.evaluate(() => sessionStorage.getItem('cps-family-token'));
  expect(token).not.toBeNull();

  await ctx.close();
});
