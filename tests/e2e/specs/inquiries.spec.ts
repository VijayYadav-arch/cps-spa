import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

test.describe('InquiriesPage /admin/inquiries (Step 4 Group A PR #83)', () => {
  test('renders list and master-detail panel on row click', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/inquiries',
        body: {
          data: [
            {
              id: 1,
              firstName: 'Jane',
              lastName: 'Doe',
              email: 'jane@example.com',
              phone: '555-0100',
              organization: 'Acme Co.',
              serviceType: 'hospice-billing',
              message: 'Interested in pricing',
              status: 'new',
              createdAt: '2026-06-04T00:00:00Z',
            },
          ],
          pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1 },
        },
      },
    ]);

    await page.goto('/admin/inquiries');
    await expect(page.getByRole('heading', { name: /inquiries/i })).toBeVisible();
    await expect(page.getByText(/select an inquiry/i)).toBeVisible();

    await page.getByRole('button', { name: /Jane Doe/ }).click();

    await expect(page.getByRole('heading', { name: /inquiry details/i })).toBeVisible();
    // 'Acme Co.' renders in both the list-row preview and the detail dd.
    // Target the dd in the dialog/aside by exact match.
    await expect(page.getByText('Acme Co.', { exact: true })).toBeVisible();
    await expect(page.getByText('555-0100', { exact: true })).toBeVisible();
  });

  test('shows empty state when no inquiries', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/inquiries',
        body: { data: [], pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 } },
      },
    ]);

    await page.goto('/admin/inquiries');
    await expect(page.getByText(/no inquiries yet/i)).toBeVisible();
  });
});
