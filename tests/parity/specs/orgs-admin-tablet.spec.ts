import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// /admin/organizations/* — tablet viewport (768x1024, iPad).
// Compile-only in CI today; see orgs-admin-mobile.spec.ts for rationale.
test.use({ viewport: { width: 768, height: 1024 } });

test('orgs admin tablet — list table renders, create flow lands on detail', async ({
  browser,
  spa,
}) => {
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await ctx.newPage();
  await asStaffUser(page);

  // List view — at md:+, the desktop table is the visible layout.
  await page.goto(`${spa.url}/admin/organizations`);
  await page.waitForSelector('h1');
  await expect(page.getByRole('heading', { name: /organizations/i })).toBeVisible();

  // Table is visible at md:+
  await page.waitForSelector('table tbody tr', { timeout: 10_000 });

  // Click "New organization"
  await page.getByRole('link', { name: /new organization/i }).click();
  await page.waitForURL(/\/admin\/organizations\/new$/);
  await expect(page).toHaveURL(/\/admin\/organizations\/new$/);

  // Fill required fields
  const stamp = Date.now();
  await page.fill('#name', `Tablet Org ${stamp}`);
  await page.fill('#slug', `tablet-org-${stamp}`);
  await page.fill('#phone', '555-200-3000');

  // Submit
  await page.getByRole('button', { name: /^create$/i }).click();

  await page.waitForURL(/\/admin\/organizations\/\d+$/);
  await expect(page).toHaveURL(/\/admin\/organizations\/\d+$/);

  // Edit link should be visible on the new detail page for an active org
  await expect(page.getByRole('link', { name: /^edit$/i })).toBeVisible();

  await ctx.close();
});
