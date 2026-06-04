import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

test.describe('NewClaimForm /claims/new (Step 4 PR #77)', () => {
  test('submits a new claim and navigates to detail', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/organizations',
        body: {
          data: [
            { id: 1, name: 'Acme Hospice', slug: 'acme', email: null, phone: null, isActive: true, createdAt: '2026-06-01T00:00:00Z' },
          ],
          pagination: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
        },
      },
      {
        method: 'POST',
        path: '/claims',
        body: {
          data: {
            id: 42,
            patientName: 'Jane Doe',
            status: 'submitted',
            amount: 200,
            submittedDate: null,
            organizationId: 1,
            createdAt: '2026-06-04T00:00:00Z',
            paidAmount: null,
            denialReason: null,
            updatedAt: null,
            serviceLines: [],
          },
        },
      },
      // GET /claims/42 for the navigated-to detail page
      {
        method: 'GET',
        path: '/claims/42',
        body: {
          data: {
            id: 42,
            patientName: 'Jane Doe',
            status: 'submitted',
            amount: 200,
            organizationId: 1,
          },
        },
      },
    ]);

    await page.goto('/claims/new');
    await expect(page.getByRole('heading', { name: /new claim/i })).toBeVisible();

    await page.getByRole('textbox', { name: /patient name/i }).fill('Jane Doe');
    await page.getByRole('spinbutton', { name: /amount/i }).fill('200');
    await page.getByRole('textbox', { name: /primary diagnosis/i }).fill('I50.9');
    await page.getByRole('button', { name: /create claim/i }).click();

    await expect(page).toHaveURL(/\/claims\/42$/);
  });

  test('blocks submit when patient name is empty', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      { method: 'GET', path: '/organizations', body: { data: [], pagination: { total: 0, page: 1, pageSize: 100, totalPages: 0 } } },
    ]);

    await page.goto('/claims/new');
    await page.getByRole('spinbutton', { name: /amount/i }).fill('100');
    await page.getByRole('button', { name: /create claim/i }).click();

    await expect(page.getByRole('alert')).toContainText(/patient name is required/i);
  });
});
