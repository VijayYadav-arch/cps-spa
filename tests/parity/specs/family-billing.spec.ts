import { test, expect } from '../fixtures/dual-app';
import { asFamilyMember } from '../helpers/auth';

test('family billing renders equivalent page-title on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asFamilyMember(pageNext, { patientId: 1, pin: '1234' });
  await pageNext.goto(`${nextjs.url}/family/billing`);
  await pageNext.waitForSelector('[data-testid="page-title"]');
  const nextTitle = await pageNext.textContent('[data-testid="page-title"]');

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asFamilyMember(pageSpa, { patientId: 1, pin: '1234' });
  await pageSpa.goto(`${spa.url}/family/billing`);
  await pageSpa.waitForSelector('[data-testid="page-title"]');
  const spaTitle = await pageSpa.textContent('[data-testid="page-title"]');

  expect(spaTitle).toBe(nextTitle);

  // cps-spa-only: either rows or empty state must render
  const hasRows = await pageSpa.locator('[data-testid="billing-rows"]').count();
  const hasEmpty = await pageSpa.locator('[data-testid="billing-empty"]').count();
  expect(hasRows + hasEmpty).toBeGreaterThan(0);

  await ctxNext.close();
  await ctxSpa.close();
});
