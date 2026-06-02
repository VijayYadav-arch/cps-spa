import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

const CLAIM_ID = 1; // test claim seeded in dev/test database

// Admin claim detail parity. cps Next.js: /admin/claims/:id ; cps-spa: /claims/:id.
// Neither page has data-testid markers yet — assert a heading renders on each
// side. The exact heading text differs (cps Next.js uses claim number; cps-spa
// uses "Claim #<id>"), so we only assert that ANY heading rendered.
test('admin claim detail renders heading on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/admin/claims/${CLAIM_ID}`);
  await pageNext.waitForSelector('h1, h2');
  await expect(pageNext.getByRole('heading').first()).toBeVisible();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/claims/${CLAIM_ID}`);
  await pageSpa.waitForSelector('h1, h2');
  await expect(pageSpa.getByRole('heading', { name: /claim/i }).first()).toBeVisible();

  await ctxNext.close();
  await ctxSpa.close();
});
