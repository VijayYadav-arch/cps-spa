// @ts-nocheck — capture utility, not an assertion suite.
//
// Generates real UI screenshots for the docs site (cps-docs). Gated behind
// CAPTURE=1 so it never runs in the normal e2e suite / CI. Boots the same Vite
// dev server with dev-auth + network-mocked /api/v2, navigates to key pages with
// realistic (synthetic, no PHI) data, and writes viewport PNGs to
// tests/e2e/screenshots/. Copy those into cps-docs/public/screenshots/.
//
//   CAPTURE=1 npx playwright test --config=tests/e2e/playwright.config.ts capture-screenshots
import { test } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

const OUT = 'tests/e2e/screenshots';
const VIEWPORT = { width: 1440, height: 900 };

test.skip(!process.env.CAPTURE, 'screenshot capture — run with CAPTURE=1');

test.use({ viewport: VIEWPORT });

const ORGS = [
  { id: 1, name: 'Demo Hospice North' },
  { id: 2, name: 'Demo Hospice South' },
  { id: 3, name: 'Riverbend Home Health' },
];

function rolloutBody(orgId: number) {
  if (orgId === 1) {
    return { ready: true, realSubmissionEnabled: true, checks: pass() };
  }
  if (orgId === 2) {
    return { ready: true, realSubmissionEnabled: false, checks: pass() };
  }
  return {
    ready: false,
    realSubmissionEnabled: false,
    checks: [
      { name: 'clearinghouse-config', passed: true, detail: "Active primary clearinghouse 'availity' configured." },
      { name: 'clearinghouse-credentials', passed: true, detail: 'Submitter id and credential present.' },
      { name: 'payer-enrollment', passed: false, detail: 'No active (non-expired) payer enrollment for this org.' },
    ],
  };
}
function pass() {
  return [
    { name: 'clearinghouse-config', passed: true, detail: "Active primary clearinghouse 'availity' configured." },
    { name: 'clearinghouse-credentials', passed: true, detail: 'Submitter id and credential present.' },
    { name: 'payer-enrollment', passed: true, detail: 'At least one active payer enrollment on file.' },
  ];
}

test('help index', async ({ page }) => {
  await loginAsTestUser(page);
  await page.goto('/help');
  await page.waitForSelector('[data-testid="help-landing"]');
  await page.screenshot({ path: `${OUT}/help-index.png` });
});

test('help article', async ({ page }) => {
  await loginAsTestUser(page);
  await page.goto('/help/submit-a-claim');
  await page.waitForSelector('[data-testid="help-article"]');
  await page.screenshot({ path: `${OUT}/help-article.png` });
});

test('submission rollout', async ({ page }) => {
  await loginAsTestUser(page);
  await mockApi(page, [
    { method: 'GET', path: '/organizations', body: { data: ORGS, pagination: { total: 3, page: 1, pageSize: 200 } } },
  ]);
  // Per-org readiness varies, so route it dynamically (registered after mockApi → wins).
  await page.route(/\/api\/v2\/billing\/submission-rollout\/\d+/, async (route) => {
    const id = Number(new URL(route.request().url()).pathname.split('/').pop());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: rolloutBody(id) }) });
  });
  await page.goto('/admin/submission-rollout');
  await page.waitForSelector('[data-testid="rollout-row-3"]');
  await page.screenshot({ path: `${OUT}/submission-rollout.png` });
});

test('ai opt-in', async ({ page }) => {
  await loginAsTestUser(page);
  await mockApi(page, [
    { method: 'GET', path: '/organizations', body: { data: ORGS, pagination: { total: 3, page: 1, pageSize: 200 } } },
    {
      method: 'GET',
      path: '/admin/ai/opt-in',
      body: {
        data: [
          { id: 10, organizationId: 1, enabled: true, enabledByUserId: 1, enabledAtUtc: '2026-06-10T00:00:00Z', disabledByUserId: null, disabledAtUtc: null, notes: 'BAA-4123 signed' },
          { id: 20, organizationId: 2, enabled: false, enabledByUserId: 1, enabledAtUtc: '2026-06-01T00:00:00Z', disabledByUserId: 2, disabledAtUtc: '2026-06-08T00:00:00Z', notes: null },
        ],
      },
    },
  ]);
  await page.goto('/admin/ai-opt-in');
  await page.waitForSelector('[data-testid="opt-in-table"]');
  await page.screenshot({ path: `${OUT}/ai-opt-in.png` });
});

test('denials list', async ({ page }) => {
  await loginAsTestUser(page);
  const denial = (id, status, category, reason) => ({
    id, claimId: 100 + id, organizationId: 1, status, denialCode: 'CO-50',
    denialReason: reason, category, appealDeadline: '2026-07-01', resolvedAt: null,
    assignedTo: null, appealHistory: null, createdAt: '2026-06-04T00:00:00Z', updatedAt: '2026-06-04T00:00:00Z',
  });
  await mockApi(page, [
    {
      method: 'GET',
      path: '/billing/denials',
      body: {
        data: [
          denial(1, 'new', 'medical-necessity', 'Not medically necessary'),
          denial(2, 'new', 'auth', 'Prior authorization required'),
          denial(3, 'appealing', 'coding', 'Invalid procedure/diagnosis combination'),
        ],
        pagination: { total: 3, page: 1, pageSize: 50 },
      },
    },
  ]);
  await page.goto('/billing/denials');
  await page.waitForSelector('text=/denial management/i');
  await page.screenshot({ path: `${OUT}/denials-list.png` });
});
