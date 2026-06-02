import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

test('commercial documents page renders equivalent rows on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/portal/documents`);
  await pageNext.waitForSelector('[data-testid="page-title"]');
  const nextTitle = await pageNext.textContent('[data-testid="page-title"]');
  const nextRows = await pageNext.locator('[data-testid="document-row"]').count();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/portal/documents`);
  await pageSpa.waitForSelector('[data-testid="page-title"]');
  const spaTitle = await pageSpa.textContent('[data-testid="page-title"]');
  const spaRows = await pageSpa.locator('[data-testid="document-row"]').count();

  expect(spaTitle).toBe(nextTitle);
  expect(spaRows).toBe(nextRows);

  await ctxNext.close();
  await ctxSpa.close();
});
