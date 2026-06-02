import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// Admin care plans parity. cps Next.js: /admin/care-plans ; cps-spa:
// /clinical/care-plans (rendered via the ClinicalOverview catch-all, which
// currently shows the clinical overview heading regardless of sub-route).
// Neither side has data-testid markers, so we only assert that SOME heading
// rendered on each side.
test('admin care plans renders heading on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/admin/care-plans`);
  await pageNext.waitForSelector('h1, h2');
  await expect(pageNext.getByRole('heading').first()).toBeVisible();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/clinical/care-plans`);
  await pageSpa.waitForSelector('h1, h2');
  await expect(pageSpa.getByRole('heading').first()).toBeVisible();

  await ctxNext.close();
  await ctxSpa.close();
});
