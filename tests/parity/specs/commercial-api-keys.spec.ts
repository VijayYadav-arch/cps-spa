import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

test('commercial api-keys page renders equivalent list on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/portal/api-keys`);
  await pageNext.waitForSelector('[data-testid="page-title"]');
  const nextTitle = await pageNext.textContent('[data-testid="page-title"]');
  const nextList = await pageNext.textContent('[data-testid="api-keys-list"]');
  const nextRows = await pageNext.locator('[data-testid="api-key-row"]').count();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/portal/api-keys`);
  await pageSpa.waitForSelector('[data-testid="page-title"]');
  const spaTitle = await pageSpa.textContent('[data-testid="page-title"]');
  const spaList = await pageSpa.textContent('[data-testid="api-keys-list"]');
  const spaRows = await pageSpa.locator('[data-testid="api-key-row"]').count();

  expect(spaTitle).toBe(nextTitle);
  expect(spaList).toBe(nextList);
  expect(spaRows).toBe(nextRows);

  await ctxNext.close();
  await ctxSpa.close();
});
