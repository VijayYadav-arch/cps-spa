import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

test('clinician dashboard renders equivalent stats on both apps', async ({ browser, nextjs, spa }) => {
  // Next.js baseline
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/clinician/dashboard`);
  await pageNext.waitForSelector('[data-testid="page-title"]');
  const nextAssigned = await pageNext.textContent('[data-testid="stat-assigned-patients"]');
  const nextVisits = await pageNext.textContent('[data-testid="stat-visits-this-week"]');
  const nextPending = await pageNext.textContent('[data-testid="stat-pending-documentation"]');

  // cps-spa equivalent
  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/clinician/dashboard`);
  await pageSpa.waitForSelector('[data-testid="page-title"]');
  const spaAssigned = await pageSpa.textContent('[data-testid="stat-assigned-patients"]');
  const spaVisits = await pageSpa.textContent('[data-testid="stat-visits-this-week"]');
  const spaPending = await pageSpa.textContent('[data-testid="stat-pending-documentation"]');

  expect(spaAssigned).toBe(nextAssigned);
  expect(spaVisits).toBe(nextVisits);
  expect(spaPending).toBe(nextPending);

  await ctxNext.close();
  await ctxSpa.close();
});
