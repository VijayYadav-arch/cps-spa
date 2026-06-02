import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// Admin work queue parity. cps Next.js: /admin/billing/work-queue ; cps-spa:
// /billing/work-queue (rendered via the BillingDashboard catch-all). Neither
// side has data-testid markers, so we only assert that SOME heading rendered
// on each side.
test('admin billing work queue renders heading on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/admin/billing/work-queue`);
  await pageNext.waitForSelector('h1, h2');
  await expect(pageNext.getByRole('heading').first()).toBeVisible();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/billing/work-queue`);
  await pageSpa.waitForSelector('h1, h2');
  await expect(pageSpa.getByRole('heading').first()).toBeVisible();

  await ctxNext.close();
  await ctxSpa.close();
});
