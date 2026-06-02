import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// Admin ERA posting parity. cps Next.js: /admin/billing/era-posting ; cps-spa:
// /billing/era-posting (rendered via the BillingDashboard catch-all). Neither
// side has data-testid markers, so we only assert that SOME heading rendered
// on each side.
test('admin billing ERA posting renders heading on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/admin/billing/era-posting`);
  await pageNext.waitForSelector('h1, h2');
  await expect(pageNext.getByRole('heading').first()).toBeVisible();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/billing/era-posting`);
  await pageSpa.waitForSelector('h1, h2');
  await expect(pageSpa.getByRole('heading').first()).toBeVisible();

  await ctxNext.close();
  await ctxSpa.close();
});
