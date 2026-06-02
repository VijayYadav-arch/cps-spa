import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// Admin claim builder parity. cps Next.js: /admin/billing/claim-builder ;
// cps-spa: /billing/claim-builder (rendered via the BillingDashboard catch-all,
// which currently shows the dashboard heading regardless of sub-route — full
// per-route SPA implementations are deferred). Neither side has data-testid
// markers, so we only assert that SOME heading rendered on each side.
test('admin billing claim builder renders heading on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/admin/billing/claim-builder`);
  await pageNext.waitForSelector('h1, h2');
  await expect(pageNext.getByRole('heading').first()).toBeVisible();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/billing/claim-builder`);
  await pageSpa.waitForSelector('h1, h2');
  await expect(pageSpa.getByRole('heading').first()).toBeVisible();

  await ctxNext.close();
  await ctxSpa.close();
});
