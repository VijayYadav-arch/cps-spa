import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

// Covers the 3 simple admin-clinical list pages from Step 4 Group B
// (PRs #87, #88, #89). idg-meetings is exercised in its own spec because
// it depends on the hospice endpoint.

test.describe('MedicationsPage /admin/medications (Step 4 Group B PR #87)', () => {
  test('renders rows + summary cards', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/clinical/medications',
        body: {
          data: [
            {
              id: 1,
              name: 'Aspirin',
              genericName: null,
              dosage: '81mg',
              route: 'oral',
              frequency: 'daily',
              purpose: 'pain',
              isHospiceRelated: true,
              isActive: true,
            },
          ],
        },
      },
    ]);

    await page.goto('/admin/medications');
    await expect(page.getByRole('heading', { name: /medications/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /Aspirin/ })).toBeVisible();
  });
});

test.describe('OrdersPage /admin/orders (Step 4 Group B PR #88)', () => {
  test('renders rows with status badge', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/clinical/orders',
        body: {
          data: [
            {
              id: 1,
              orderDate: '2026-06-01T00:00:00Z',
              orderType: 'medication',
              orderText: 'Aspirin 81mg PO daily',
              orderedBy: 'Dr. Smith',
              isVerbal: false,
              signedBy: 'Dr. Smith',
              status: 'completed',
            },
          ],
        },
      },
    ]);

    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: /physician orders/i })).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible();
  });
});

test.describe('ReferralsPage /admin/referrals (Step 4 Group B PR #89)', () => {
  test('renders pipeline summary cards', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/clinical/referrals',
        body: {
          data: [
            {
              id: 1,
              referralDate: '2026-06-01T00:00:00Z',
              patientName: 'Jane Doe',
              sourceName: 'Memorial Hospital',
              sourceType: 'hospital',
              primaryDiagnosis: 'I50.9',
              urgency: 'urgent',
              status: 'new',
            },
          ],
        },
      },
    ]);

    await page.goto('/admin/referrals');
    await expect(page.getByRole('heading', { name: /referrals/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Jane Doe' })).toBeVisible();
    await expect(page.getByText('URGENT')).toBeVisible();
  });
});

test.describe('IdgMeetingsPage /admin/idg-meetings (Step 4 Group B PR #90)', () => {
  test('renders empty state when nothing scheduled', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      { method: 'GET', path: '/hospice/idg-meetings/upcoming', body: { data: [] } },
    ]);

    await page.goto('/admin/idg-meetings');
    await expect(page.getByText(/no idg meetings scheduled/i)).toBeVisible();
  });
});
