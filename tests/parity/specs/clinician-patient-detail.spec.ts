import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

const PATIENT_ID = 1; // test patient seeded in dev/test database

test('clinician patient detail renders equivalent identity on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/clinician/patients/${PATIENT_ID}`);
  await pageNext.waitForSelector('[data-testid="patient-name"]');
  const nextName = await pageNext.textContent('[data-testid="patient-name"]');
  const nextMrn = await pageNext.textContent('[data-testid="patient-mrn"]');
  const nextDob = await pageNext.textContent('[data-testid="patient-dob"]');

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/clinician/patients/${PATIENT_ID}`);
  await pageSpa.waitForSelector('[data-testid="patient-name"]');
  const spaName = await pageSpa.textContent('[data-testid="patient-name"]');
  const spaMrn = await pageSpa.textContent('[data-testid="patient-mrn"]');
  const spaDob = await pageSpa.textContent('[data-testid="patient-dob"]');

  expect(spaName).toBe(nextName);
  expect(spaMrn).toBe(nextMrn);
  expect(spaDob).toBe(nextDob);

  await ctxNext.close();
  await ctxSpa.close();
});
