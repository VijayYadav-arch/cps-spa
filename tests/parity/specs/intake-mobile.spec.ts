import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// Patient intake wizard — mobile viewport (375x667, iPhone SE).
// Authenticates a staff user, walks the 5 wizard steps with valid data, and
// expects a redirect to /spa/patients/<id> on completion.
//
// Note: this spec is compile-only in CI today (Playwright requires a running
// cps-dotnet backend + Front Door routing; CI infrastructure is a follow-up).
test.use({ viewport: { width: 375, height: 667 } });

test('intake wizard mobile — staff user completes 5 steps + lands on patient detail', async ({
  browser,
  spa,
}) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();
  await asStaffUser(page);

  await page.goto(`${spa.url}/patients/intake`);
  await page.waitForSelector('h1, label');

  // Discard any pre-existing draft so the test always starts at step 1.
  const discard = page.getByRole('button', { name: /discard and start fresh/i });
  if (await discard.isVisible().catch(() => false)) {
    await discard.click();
  }

  // Step 1: Organization & Patient Basics
  await page.selectOption('#organizationId', { index: 1 });
  await page.fill('#firstName', 'Jane');
  await page.fill('#lastName', 'Doe');
  await page.fill('#dateOfBirth', '1955-04-12');
  await page.selectOption('#gender', 'female');
  await page.getByRole('button', { name: /^next$/i }).click();

  // Step 2: Contact & Facility
  await page.waitForSelector('#phone');
  await page.fill('#phone', '555-123-4567');
  await page.fill('#city', 'Austin');
  await page.selectOption('#state', 'TX');
  await page.fill('#zipCode', '78701');
  await page.getByRole('button', { name: /^next$/i }).click();

  // Step 3: Insurance & Clinical
  await page.waitForSelector('#primaryDiagnosis');
  await page.fill('#primaryDiagnosis', 'C34.90');
  await page.fill('#primaryDiagnosisDesc', 'Lung cancer, unspecified');
  await page.getByRole('button', { name: /^next$/i }).click();

  // Step 4: Admission
  await page.waitForSelector('#admissionType');
  await page.selectOption('#admissionType', 'hospice');
  // admittedAt + levelOfCare + benefitPeriod default to today / RHC / 1
  await page.getByRole('button', { name: /^next$/i }).click();

  // Step 5: Certification
  await page.waitForSelector('#certifiedByName');
  await page.fill('#certifiedByName', 'Dr. Jordan Smith');
  await page.fill('#certifiedByNPI', '1234567890');
  // certificationDate + effectiveFrom default to today; effectiveTo auto-fills.

  // Final submit.
  await page.getByRole('button', { name: /complete intake/i }).click();

  // Expect navigation to the newly-created patient detail page.
  await page.waitForURL(/\/patients\/\d+$/);
  await expect(page).toHaveURL(/\/patients\/\d+$/);

  await ctx.close();
});
