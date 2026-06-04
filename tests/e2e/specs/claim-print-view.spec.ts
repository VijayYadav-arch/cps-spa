import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

test.describe('ClaimPrintView /claims/:id/print (Step 4 PR #78)', () => {
  test('renders CMS-1500 form + print buttons when claim loads', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/claims/7',
        body: {
          data: {
            id: 7,
            claimNumber: 'CLM-2026-00007',
            organizationId: 1,
            patientName: 'Jane Doe',
            patientId: 42,
            encounterId: null,
            serviceDate: '2026-05-01',
            submittedDate: null,
            amount: 250.0,
            paidAmount: null,
            status: 'draft',
            payer: 'Medicare',
            denialReason: null,
            createdAt: '2026-06-04T00:00:00Z',
            updatedAt: '2026-06-04T00:00:00Z',
            insuranceType: 'medicare',
            insuredIdNumber: '123-45-6789',
            serviceLines: [],
            patient: {
              id: 42,
              firstName: 'Jane',
              lastName: 'Doe',
              dateOfBirth: '1948-01-15',
              gender: 'F',
            },
          },
        },
      },
    ]);

    await page.goto('/claims/7/print');
    await expect(page.getByRole('button', { name: /^print$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /back to claim/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /download pdf/i })).toBeVisible();
    await expect(page.getByText(/CMS-1500 claim CLM-2026-00007/)).toBeVisible();
  });

  test('shows error state when fetch fails', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      { method: 'GET', path: '/claims/99', status: 500, body: { error: 'Internal Server Error' } },
    ]);

    await page.goto('/claims/99/print');
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
