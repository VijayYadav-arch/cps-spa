import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

const PATIENT_ID = 1; // test patient seeded in dev/test database

// Admin patient detail parity. cps Next.js: /admin/patients/:id ; cps-spa:
// /patients/:id. Neither page has data-testid markers yet — assert a heading
// renders on each side. Exact patient-name heading text comes from the same
// backend so a match would be data-driven, but we keep this compile-only and
// just assert that SOME heading rendered.
test('admin patient detail renders heading on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/admin/patients/${PATIENT_ID}`);
  await pageNext.waitForSelector('h1, h2');
  await expect(pageNext.getByRole('heading').first()).toBeVisible();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/patients/${PATIENT_ID}`);
  await pageSpa.waitForSelector('h1, h2');
  await expect(pageSpa.getByRole('heading').first()).toBeVisible();

  await ctxNext.close();
  await ctxSpa.close();
});
