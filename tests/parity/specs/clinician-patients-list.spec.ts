import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

test('clinician patients list renders equivalent rows on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/clinician/patients`);
  await pageNext.waitForSelector('[data-testid="page-title"]');
  const nextCount = await pageNext.textContent('[data-testid="patient-count"]');
  const nextRows = await pageNext.locator('[data-testid="patient-row"]').count();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/clinician/patients`);
  await pageSpa.waitForSelector('[data-testid="page-title"]');
  const spaCount = await pageSpa.textContent('[data-testid="patient-count"]');
  const spaRows = await pageSpa.locator('[data-testid="patient-row"]').count();

  expect(spaCount).toBe(nextCount);
  expect(spaRows).toBe(nextRows);

  await ctxNext.close();
  await ctxSpa.close();
});
