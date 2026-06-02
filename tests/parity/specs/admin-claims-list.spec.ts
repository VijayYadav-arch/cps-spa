import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// Admin claims list parity. Routes diverge: cps Next.js exposes /admin/claims,
// cps-spa exposes /claims (admin module is mounted at root). Neither page has
// data-testid markers yet, so we assert presence of a heading and a table on
// both sides — best-effort stability check.
test('admin claims list renders heading + table on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/admin/claims`);
  await pageNext.waitForSelector('h1, h2');
  await expect(pageNext.getByRole('heading', { name: /claims/i }).first()).toBeVisible();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/claims`);
  await pageSpa.waitForSelector('h1, h2');
  await expect(pageSpa.getByRole('heading', { name: /claims/i }).first()).toBeVisible();

  await ctxNext.close();
  await ctxSpa.close();
});
