import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// /admin/encounters/* — mobile viewport (375x667, iPhone SE).
// Authenticates a staff user with clinical:visit_notes, navigates to the list,
// verifies it renders, clicks "New encounter", picks a patient via the
// typeahead, fills the required fields, submits, and expects navigation back
// to the list.
//
// Note: this spec is compile-only in CI today (Playwright requires a running
// cps-dotnet backend + Front Door routing + a seeded patient; CI infrastructure
// is a follow-up).
test.use({ viewport: { width: 375, height: 667 } });

test('encounters admin mobile — list loads, create flow lands on list', async ({ browser, spa }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();
  await asStaffUser(page);

  // List view
  await page.goto(`${spa.url}/admin/encounters`);
  await page.waitForSelector('h1');
  await expect(page.getByRole('heading', { name: /encounters/i })).toBeVisible();

  // At least one encounter card visible on mobile (md:hidden card list)
  await page.waitForSelector('ul li', { timeout: 10_000 });

  // Click "New encounter"
  await page.getByRole('link', { name: /new encounter/i }).click();
  await page.waitForURL(/\/admin\/encounters\/new$/);
  await expect(page).toHaveURL(/\/admin\/encounters\/new$/);

  // Pick a patient via the typeahead
  await page.getByLabel(/search patients/i).fill('a');
  // Wait for the dropdown to populate then click the first result.
  await page.waitForSelector('ul li button', { timeout: 10_000 });
  await page.locator('ul li button').first().click();

  // Fill remaining required fields
  await page.fill('#provider', 'Dr. Mobile');
  await page.fill('#diagnosisCodes', 'A1.2');
  await page.fill('#procedureCodes', '99213');

  // Submit
  await page.getByRole('button', { name: /create encounter/i }).click();

  // Expect navigation back to the list
  await page.waitForURL(/\/admin\/encounters$/);
  await expect(page).toHaveURL(/\/admin\/encounters$/);

  await ctx.close();
});
