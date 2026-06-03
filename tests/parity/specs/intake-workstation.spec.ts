import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// Patient intake wizard — workstation viewport (1280x800, laptop).
// Compile-only in CI today; see intake-mobile.spec.ts for rationale.
test.use({ viewport: { width: 1280, height: 800 } });

test('intake wizard workstation — staff user completes 5 steps + lands on patient detail', async ({
  browser,
  spa,
}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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
  await page.fill('#firstName', 'Sam');
  await page.fill('#lastName', 'Taylor');
  await page.fill('#dateOfBirth', '1962-02-18');
  await page.selectOption('#gender', 'other');
  await page.getByRole('button', { name: /^next$/i }).click();

  // Step 2
  await page.waitForSelector('#phone');
  await page.fill('#phone', '555-444-3322');
  await page.fill('#city', 'Houston');
  await page.selectOption('#state', 'TX');
  await page.fill('#zipCode', '77002');
  await page.getByRole('button', { name: /^next$/i }).click();

  // Step 3
  await page.waitForSelector('#primaryDiagnosis');
  await page.fill('#primaryDiagnosis', 'G30.9');
  await page.fill('#primaryDiagnosisDesc', 'Alzheimer disease, unspecified');
  await page.getByRole('button', { name: /^next$/i }).click();

  // Step 4
  await page.waitForSelector('#admissionType');
  await page.selectOption('#admissionType', 'hospice');
  await page.getByRole('button', { name: /^next$/i }).click();

  // Step 5
  await page.waitForSelector('#certifiedByName');
  await page.fill('#certifiedByName', 'Dr. Morgan Chen');
  await page.fill('#certifiedByNPI', '1029384756');

  await page.getByRole('button', { name: /complete intake/i }).click();

  await page.waitForURL(/\/patients\/\d+$/);
  await expect(page).toHaveURL(/\/patients\/\d+$/);

  await ctx.close();
});
