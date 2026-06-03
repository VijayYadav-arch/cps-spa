import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// /admin/encounters/* — workstation viewport (1280x800, laptop).
// Compile-only in CI today; see encounters-mobile.spec.ts for rationale.
test.use({ viewport: { width: 1280, height: 800 } });

test('encounters admin workstation — full table renders, create flow lands on list', async ({
  browser,
  spa,
}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await asStaffUser(page);

  // List view — at lg:+, the table includes the Organization column.
  await page.goto(`${spa.url}/admin/encounters`);
  await page.waitForSelector('h1');
  await expect(page.getByRole('heading', { name: /encounters/i })).toBeVisible();

  // Table is visible with lg:table-cell Organization header
  await page.waitForSelector('table thead th', { timeout: 10_000 });

  // Search + include-deleted filter should be reachable.
  const search = page.getByRole('searchbox', { name: /search encounters/i });
  await expect(search).toBeVisible();

  // Click "New encounter"
  await page.getByRole('link', { name: /new encounter/i }).click();
  await page.waitForURL(/\/admin\/encounters\/new$/);

  // Pick a patient via the typeahead
  await page.getByLabel(/search patients/i).fill('a');
  await page.waitForSelector('ul li button', { timeout: 10_000 });
  await page.locator('ul li button').first().click();

  // Fill required fields
  await page.fill('#provider', 'Dr. Workstation');
  await page.fill('#diagnosisCodes', 'C3.1');
  await page.fill('#procedureCodes', '99215');
  await page.fill('#notes', 'Workstation parity smoke test note');

  // Submit
  await page.getByRole('button', { name: /create encounter/i }).click();

  // Expect navigation back to the list
  await page.waitForURL(/\/admin\/encounters$/);
  await expect(page).toHaveURL(/\/admin\/encounters$/);

  await ctx.close();
});
