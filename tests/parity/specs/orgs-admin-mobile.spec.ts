import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// /admin/organizations/* — mobile viewport (375x667, iPhone SE).
// Authenticates a staff user with admin:manage_orgs, navigates to the list,
// verifies it renders, clicks "New organization", fills the required fields,
// submits, and expects navigation to the detail page.
//
// Note: this spec is compile-only in CI today (Playwright requires a running
// cps-dotnet backend + Front Door routing; CI infrastructure is a follow-up).
test.use({ viewport: { width: 375, height: 667 } });

test('orgs admin mobile — list loads, create flow lands on detail', async ({ browser, spa }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();
  await asStaffUser(page);

  // List view
  await page.goto(`${spa.url}/admin/organizations`);
  await page.waitForSelector('h1');
  await expect(page.getByRole('heading', { name: /organizations/i })).toBeVisible();

  // At least one org card visible on mobile (md:hidden card list)
  await page.waitForSelector('ul li', { timeout: 10_000 });

  // Click "New organization"
  await page.getByRole('link', { name: /new organization/i }).click();
  await page.waitForURL(/\/admin\/organizations\/new$/);
  await expect(page).toHaveURL(/\/admin\/organizations\/new$/);

  // Fill required fields
  const stamp = Date.now();
  await page.fill('#name', `Test Org ${stamp}`);
  await page.fill('#slug', `test-org-${stamp}`);
  await page.fill('#email', 'test@orgs.parity');

  // Submit
  await page.getByRole('button', { name: /^create$/i }).click();

  // Expect navigation to the newly-created org detail page
  await page.waitForURL(/\/admin\/organizations\/\d+$/);
  await expect(page).toHaveURL(/\/admin\/organizations\/\d+$/);
  await expect(page.getByRole('heading', { name: new RegExp(`test org ${stamp}`, 'i') })).toBeVisible();

  await ctx.close();
});
