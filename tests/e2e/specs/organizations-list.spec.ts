import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

test.describe('OrganizationsList /admin/organizations (Step 4 Phase A PR #71)', () => {
  test('renders the admin org list', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/organizations',
        body: {
          data: [
            {
              id: 1,
              name: 'Acme Hospice',
              slug: 'acme-hospice',
              email: 'ops@acme.example',
              phone: null,
              address: null,
              taxId: null,
              active: true,
              isDeleted: false,
              parentOrganizationId: null,
              claimsCount: 12,
              patientsCount: 34,
              createdAt: '2026-06-01T00:00:00Z',
              updatedAt: '2026-06-01T00:00:00Z',
            },
            {
              id: 2,
              name: 'Beta Health',
              slug: 'beta-health',
              email: null,
              phone: null,
              address: null,
              taxId: null,
              active: true,
              isDeleted: false,
              parentOrganizationId: null,
              claimsCount: 0,
              patientsCount: 5,
              createdAt: '2026-06-01T00:00:00Z',
              updatedAt: '2026-06-01T00:00:00Z',
            },
          ],
          pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
        },
      },
    ]);

    await page.goto('/admin/organizations');
    // md+ table renders org names as visible row links; mobile-card variant
    // is display:none at Playwright's default desktop viewport.
    await expect(page.getByRole('link', { name: 'Acme Hospice' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Beta Health' })).toBeVisible();
  });
});
