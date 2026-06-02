import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

test('clinician new-visit form renders equivalent structure on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/clinician/visits/new`);
  await pageNext.waitForSelector('[data-testid="visit-form"]');
  // assert all key inputs exist
  await expect(pageNext.locator('[data-testid="select-patient"]')).toBeVisible();
  await expect(pageNext.locator('[data-testid="select-visit-type"]')).toBeVisible();
  await expect(pageNext.locator('[data-testid="input-visit-date"]')).toBeVisible();
  await expect(pageNext.locator('[data-testid="submit-visit"]')).toBeVisible();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/clinician/visits/new`);
  await pageSpa.waitForSelector('[data-testid="visit-form"]');
  await expect(pageSpa.locator('[data-testid="select-patient"]')).toBeVisible();
  await expect(pageSpa.locator('[data-testid="select-visit-type"]')).toBeVisible();
  await expect(pageSpa.locator('[data-testid="input-visit-date"]')).toBeVisible();
  await expect(pageSpa.locator('[data-testid="submit-visit"]')).toBeVisible();

  await ctxNext.close();
  await ctxSpa.close();
});
