import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// Patient intake wizard — tablet viewport (768x1024, iPad).
// Compile-only in CI today; see intake-mobile.spec.ts for rationale.
test.use({ viewport: { width: 768, height: 1024 } });

test('intake wizard tablet — staff user completes 5 steps + lands on patient detail', async ({
  browser,
  spa,
}) => {
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await ctx.newPage();
  await asStaffUser(page);

  await page.goto(`${spa.url}/patients/intake`);
  await page.waitForSelector('h1, label');

  const discard = page.getByRole('button', { name: /discard and start fresh/i });
  if (await discard.isVisible().catch(() => false)) {
    await discard.click();
  }

  // Step 1
  await page.selectOption('#organizationId', { index: 1 });
  await page.fill('#firstName', 'John');
  await page.fill('#lastName', 'Roe');
  await page.fill('#dateOfBirth', '1948-09-30');
  await page.selectOption('#gender', 'male');
  await page.getByRole('button', { name: /^next$/i }).click();

  // Step 2
  await page.waitForSelector('#phone');
  await page.fill('#phone', '555-987-6543');
  await page.fill('#city', 'Dallas');
  await page.selectOption('#state', 'TX');
  await page.fill('#zipCode', '75201');
  await page.getByRole('button', { name: /^next$/i }).click();

  // Step 3
  await page.waitForSelector('#primaryDiagnosis');
  await page.fill('#primaryDiagnosis', 'I50.9');
  await page.fill('#primaryDiagnosisDesc', 'Heart failure, unspecified');
  await page.getByRole('button', { name: /^next$/i }).click();

  // Step 4
  await page.waitForSelector('#admissionType');
  await page.selectOption('#admissionType', 'hospice');
  await page.getByRole('button', { name: /^next$/i }).click();

  // Step 5
  await page.waitForSelector('#certifiedByName');
  await page.fill('#certifiedByName', 'Dr. Pat Lee');
  await page.fill('#certifiedByNPI', '9876543210');

  await page.getByRole('button', { name: /complete intake/i }).click();

  await page.waitForURL(/\/patients\/\d+$/);
  await expect(page).toHaveURL(/\/patients\/\d+$/);

  await ctx.close();
});
