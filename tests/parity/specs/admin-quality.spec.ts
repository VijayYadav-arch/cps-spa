import { test, expect } from '../fixtures/dual-app';
import { asStaffUser } from '../helpers/auth';

// Admin QAPI quality parity. cps Next.js: /admin/quality (legacy quality
// assessments table) ; cps-spa: /quality/qapi (Sub-system F QAPI dashboard).
// The two pages cover related but not identical functionality (QAPI dashboard
// is the strict superset shipped 2026-05-28). Neither side exposes a stable
// data-testid yet, so we only assert that SOME heading rendered on each side.
test('admin quality dashboard renders heading on both apps', async ({ browser, nextjs, spa }) => {
  const ctxNext = await browser.newContext();
  const pageNext = await ctxNext.newPage();
  await asStaffUser(pageNext);
  await pageNext.goto(`${nextjs.url}/admin/quality`);
  await pageNext.waitForSelector('h1, h2');
  await expect(pageNext.getByRole('heading').first()).toBeVisible();

  const ctxSpa = await browser.newContext();
  const pageSpa = await ctxSpa.newPage();
  await asStaffUser(pageSpa);
  await pageSpa.goto(`${spa.url}/quality/qapi`);
  await pageSpa.waitForSelector('h1, h2');
  await expect(pageSpa.getByRole('heading', { name: /qapi/i }).first()).toBeVisible();

  await ctxNext.close();
  await ctxSpa.close();
});
