import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

const SUMMARY = {
  asOfDate: '2026-06-04',
  revenueLast30: 100000,
  revenueLast90: 300000,
  outstandingAr: 50000,
  openDenials: 7,
  openStatements: 12,
  overallCollectionRatePct: 94.5,
};

const REVENUE = {
  from: '2026-01-01',
  to: '2026-06-01',
  points: [
    { month: '2026-05-01', billedAmount: 35000, collectedAmount: 33000, claimCount: 110 },
  ],
  totalBilled: 35000,
  totalCollected: 33000,
  collectionRatePct: 94.3,
};

const DENIALS = {
  from: '2026-01-01',
  to: '2026-06-01',
  totalDenials: 25,
  openDenials: 7,
  resolvedDenials: 18,
  topReasons: [
    {
      carc: 'CO-50',
      description: 'Not medically necessary',
      count: 8,
      writtenOffAmount: 2000,
      recoveredAmount: 1000,
    },
  ],
  byPayer: [],
};

test.describe('BillingAnalyticsPage /billing/analytics (Step 6 PR #95)', () => {
  test('renders KPI cards from dashboard summary', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      { method: 'GET', path: '/analytics/dashboard', body: { data: SUMMARY } },
      { method: 'GET', path: '/analytics/revenue', body: { data: REVENUE } },
      { method: 'GET', path: '/analytics/denials', body: { data: DENIALS } },
    ]);

    await page.goto('/billing/analytics');
    await expect(page.getByRole('heading', { name: /billing analytics/i })).toBeVisible();
    await expect(page.getByText('$100,000')).toBeVisible();
    await expect(page.getByText('94.5%')).toBeVisible();
  });

  test('renders top denial reasons table', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      { method: 'GET', path: '/analytics/dashboard', body: { data: SUMMARY } },
      { method: 'GET', path: '/analytics/revenue', body: { data: REVENUE } },
      { method: 'GET', path: '/analytics/denials', body: { data: DENIALS } },
    ]);

    await page.goto('/billing/analytics');
    await expect(page.getByText(/top denial reasons/i)).toBeVisible();
    await expect(page.getByRole('cell', { name: 'CO-50' })).toBeVisible();
  });
});
