import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

test('commercial claims page renders equivalent totals on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/portal/claims`);
  await pageNext.waitForSelector('[data-testid="page-title"]');
  const nextTitle = await pageNext.textContent('[data-testid="page-title"]');
  const nextTotal = await pageNext.textContent('[data-testid="stat-total-claims"]');
  const nextBilled = await pageNext.textContent('[data-testid="stat-total-billed"]');
  const nextPaid = await pageNext.textContent('[data-testid="stat-total-paid"]');
  const nextPending = await pageNext.textContent('[data-testid="stat-total-pending"]');
  const nextRows = await pageNext.locator('[data-testid="claim-row"]').count();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/portal/claims`);
  await pageSpa.waitForSelector('[data-testid="page-title"]');
  const spaTitle = await pageSpa.textContent('[data-testid="page-title"]');
  const spaTotal = await pageSpa.textContent('[data-testid="stat-total-claims"]');
  const spaBilled = await pageSpa.textContent('[data-testid="stat-total-billed"]');
  const spaPaid = await pageSpa.textContent('[data-testid="stat-total-paid"]');
  const spaPending = await pageSpa.textContent('[data-testid="stat-total-pending"]');
  const spaRows = await pageSpa.locator('[data-testid="claim-row"]').count();

  expect(spaTitle).toBe(nextTitle);
  expect(spaTotal).toBe(nextTotal);
  expect(spaBilled).toBe(nextBilled);
  expect(spaPaid).toBe(nextPaid);
  expect(spaPending).toBe(nextPending);
  expect(spaRows).toBe(nextRows);

  await ctxNext.close();
  await ctxSpa.close();
});
