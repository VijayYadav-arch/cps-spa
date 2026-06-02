import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

test('commercial settings sso page renders equivalent title on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/portal/settings/sso`);
  await pageNext.waitForSelector('[data-testid="page-title"]');
  const nextTitle = await pageNext.textContent('[data-testid="page-title"]');

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/portal/settings/sso`);
  await pageSpa.waitForSelector('[data-testid="page-title"]');
  const spaTitle = await pageSpa.textContent('[data-testid="page-title"]');

  expect(spaTitle).toBe(nextTitle);

  await ctxNext.close();
  await ctxSpa.close();
});
