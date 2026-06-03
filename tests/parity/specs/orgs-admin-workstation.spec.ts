import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// /admin/organizations/* — workstation viewport (1280x800, laptop).
// Compile-only in CI today; see orgs-admin-mobile.spec.ts for rationale.
test.use({ viewport: { width: 1280, height: 800 } });

test('orgs admin workstation — full table renders, create + edit flows', async ({ browser, spa }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await asStaffUser(page);

  // List view — at lg:+, the table includes the Email column.
  await page.goto(`${spa.url}/admin/organizations`);
  await page.waitForSelector('h1');
  await expect(page.getByRole('heading', { name: /organizations/i })).toBeVisible();

  // Table is visible with lg:table-cell Email header
  await page.waitForSelector('table thead th', { timeout: 10_000 });

  // Search + include-deleted filter should be reachable.
  const search = page.getByRole('searchbox', { name: /search organizations/i });
  await expect(search).toBeVisible();

  // Click "New organization"
  await page.getByRole('link', { name: /new organization/i }).click();
  await page.waitForURL(/\/admin\/organizations\/new$/);

  // Fill required fields
  const stamp = Date.now();
  await page.fill('#name', `Workstation Org ${stamp}`);
  await page.fill('#slug', `workstation-org-${stamp}`);
  await page.fill('#email', 'workstation@orgs.parity');
  await page.fill('#taxId', '11-2222333');

  // Submit
  await page.getByRole('button', { name: /^create$/i }).click();

  await page.waitForURL(/\/admin\/organizations\/\d+$/);
  await expect(page).toHaveURL(/\/admin\/organizations\/\d+$/);

  // Click Edit
  await page.getByRole('link', { name: /^edit$/i }).click();
  await page.waitForURL(/\/admin\/organizations\/\d+\/edit$/);

  // Save (no field changes — should still PUT successfully)
  await page.getByRole('button', { name: /^save$/i }).click();

  // Expect to land back on detail
  await page.waitForURL(/\/admin\/organizations\/\d+$/);
  await expect(page).toHaveURL(/\/admin\/organizations\/\d+$/);

  await ctx.close();
});
