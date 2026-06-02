import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

test('commercial dashboard renders equivalent stats on both apps', async ({ browser, nextjs, spa }) => {
  // Next.js baseline
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/portal/dashboard`);
  await pageNext.waitForSelector('[data-testid="page-title"]');
  const nextTitle = await pageNext.textContent('[data-testid="page-title"]');
  const nextActive = await pageNext.textContent('[data-testid="stat-active-claims"]');
  const nextOutstanding = await pageNext.textContent('[data-testid="stat-outstanding"]');
  const nextThisMonth = await pageNext.textContent('[data-testid="stat-this-month"]');

  // cps-spa equivalent
  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/portal/dashboard`);
  await pageSpa.waitForSelector('[data-testid="page-title"]');
  const spaTitle = await pageSpa.textContent('[data-testid="page-title"]');
  const spaActive = await pageSpa.textContent('[data-testid="stat-active-claims"]');
  const spaOutstanding = await pageSpa.textContent('[data-testid="stat-outstanding"]');
  const spaThisMonth = await pageSpa.textContent('[data-testid="stat-this-month"]');

  expect(spaTitle).toBe(nextTitle);
  expect(spaActive).toBe(nextActive);
  expect(spaOutstanding).toBe(nextOutstanding);
  expect(spaThisMonth).toBe(nextThisMonth);

  await ctxNext.close();
  await ctxSpa.close();
});
