import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// /admin/encounters/* — tablet viewport (768x1024, iPad).
// Compile-only in CI today; see encounters-mobile.spec.ts for rationale.
test.use({ viewport: { width: 768, height: 1024 } });

test('encounters admin tablet — list table renders, create flow lands on list', async ({
  browser,
  spa,
}) => {
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await ctx.newPage();
  await asStaffUser(page);

  // List view — at md:+, the desktop table is the visible layout.
  await page.goto(`${spa.url}/admin/encounters`);
  await page.waitForSelector('h1');
  await expect(page.getByRole('heading', { name: /encounters/i })).toBeVisible();

  // Table is visible at md:+
  await page.waitForSelector('table tbody tr', { timeout: 10_000 });

  // Click "New encounter"
  await page.getByRole('link', { name: /new encounter/i }).click();
  await page.waitForURL(/\/admin\/encounters\/new$/);
  await expect(page).toHaveURL(/\/admin\/encounters\/new$/);

  // Pick a patient via the typeahead
  await page.getByLabel(/search patients/i).fill('a');
  await page.waitForSelector('ul li button', { timeout: 10_000 });
  await page.locator('ul li button').first().click();

  // Fill remaining required fields
  await page.fill('#provider', 'Dr. Tablet');
  await page.fill('#diagnosisCodes', 'B2.0');
  await page.fill('#procedureCodes', '99214');

  // Submit
  await page.getByRole('button', { name: /create encounter/i }).click();

  // Expect navigation back to the list
  await page.waitForURL(/\/admin\/encounters$/);
  await expect(page).toHaveURL(/\/admin\/encounters$/);

  await ctx.close();
});
