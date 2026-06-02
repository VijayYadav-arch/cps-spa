import { test, expect } from '../fixtures/dual-app';
import { asFamilyMember } from '../helpers/auth';

test('family documents renders equivalent page-title on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asFamilyMember(pageNext, { patientId: 1, pin: '1234' });
  await pageNext.goto(`${nextjs.url}/family/documents`);
  await pageNext.waitForSelector('[data-testid="page-title"]');
  const nextTitle = await pageNext.textContent('[data-testid="page-title"]');

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asFamilyMember(pageSpa, { patientId: 1, pin: '1234' });
  await pageSpa.goto(`${spa.url}/family/documents`);
  await pageSpa.waitForSelector('[data-testid="page-title"]');
  const spaTitle = await pageSpa.textContent('[data-testid="page-title"]');

  expect(spaTitle).toBe(nextTitle);

  // cps-spa-only: either document rows or empty state must render
  const hasRows = await pageSpa.locator('[data-testid="documents-rows"]').count();
  const hasEmpty = await pageSpa.locator('[data-testid="documents-empty"]').count();
  expect(hasRows + hasEmpty).toBeGreaterThan(0);

  await ctxNext.close();
  await ctxSpa.close();
});
