import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// Admin encounters parity. cps Next.js: /admin/encounters ; cps-spa:
// /clinical/encounters (rendered via the ClinicalOverview catch-all). Neither
// side has data-testid markers, so we only assert that SOME heading rendered
// on each side.
test('admin encounters renders heading on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/admin/encounters`);
  await pageNext.waitForSelector('h1, h2');
  await expect(pageNext.getByRole('heading').first()).toBeVisible();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/clinical/encounters`);
  await pageSpa.waitForSelector('h1, h2');
  await expect(pageSpa.getByRole('heading').first()).toBeVisible();

  await ctxNext.close();
  await ctxSpa.close();
});
