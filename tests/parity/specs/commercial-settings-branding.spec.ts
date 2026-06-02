import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

test('commercial settings branding renders equivalent title and inputs on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/portal/settings/branding`);
  await pageNext.waitForSelector('[data-testid="page-title"]');
  const nextTitle = await pageNext.textContent('[data-testid="page-title"]');

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/portal/settings/branding`);
  await pageSpa.waitForSelector('[data-testid="page-title"]');
  const spaTitle = await pageSpa.textContent('[data-testid="page-title"]');

  expect(spaTitle).toBe(nextTitle);

  // Verify each branding input renders on the SPA side
  const inputTestIds = [
    'input-logo-url',
    'input-accent-color',
    'input-font-family',
    'input-custom-domain',
    'input-favicon-url',
    'input-login-message',
  ];

  for (const testId of inputTestIds) {
    await expect(pageSpa.locator(`[data-testid="${testId}"]`)).toHaveCount(1);
    await expect(pageNext.locator(`[data-testid="${testId}"]`)).toHaveCount(1);
  }

  await ctxNext.close();
  await ctxSpa.close();
});
