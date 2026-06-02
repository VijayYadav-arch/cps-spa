import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// Admin patients list parity. cps Next.js: /admin/patients ; cps-spa: /patients.
// No data-testid markers on either page yet — assert "Patients" heading + table.
test('admin patients list renders heading + table on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/admin/patients`);
  await pageNext.waitForSelector('h1, h2');
  await expect(pageNext.getByRole('heading', { name: /patients/i }).first()).toBeVisible();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/patients`);
  await pageSpa.waitForSelector('h1, h2');
  await expect(pageSpa.getByRole('heading', { name: /patients/i }).first()).toBeVisible();

  await ctxNext.close();
  await ctxSpa.close();
});
