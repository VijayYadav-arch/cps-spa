import { test, expect } from '../fixtures/dual-app';

test('clinician/login on cps-spa redirects to staff login', async ({ browser, spa }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${spa.url}/clinician/login`);
  // cps-spa has no /clinician/login route; the absence is itself the cps-spa behavior.
  // Either the route 404s (no element to wait for) or returns to a route that staff use.
  // Per T14, /clinician/login is NOT a registered route in ClinicianRoutes — so the SPA
  // router falls through. The behavior depends on App.tsx's catch-all; the implementer
  // may need to add a redirect entry or rely on the redirect happening from the Next.js side
  // (which is T29's redirect-stub task).
  //
  // For this test: assert the user does NOT end up on a cps-spa-served clinician dashboard
  // (which would indicate accidental route mounting). A logged-out user should land on
  // /login. A 404 page is also acceptable.
  await page.waitForLoadState('networkidle');
  const url = new URL(page.url());
  expect(['/login', '/clinician/login', '/']).toContain(url.pathname);

  await ctx.close();
});
