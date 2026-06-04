import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

test.describe('B2cMigrationPage /admin/b2c-migration (Step 4 Group A PR #82)', () => {
  test('renders org cards and triggers migrate POST on click', async ({ page }) => {
    await loginAsTestUser(page);
    let migrateOrgId: number | null = null;
    await mockApi(page, [
      {
        method: 'GET',
        path: '/admin/b2c-migration/organizations',
        body: {
          data: [
            {
              orgId: 1,
              orgName: 'Acme Hospice',
              slug: 'acme',
              b2CMigrated: false,
              b2CMigratedAt: null,
              totalUsers: 10,
              activeUsers: 7,
            },
          ],
        },
      },
      {
        method: 'POST',
        path: '/admin/b2c-migration/1/migrate',
        body: { invited: 7, skipped: 0, failed: 0 },
        onMatch: (route) => {
          const m = new URL(route.request().url()).pathname.match(/migration\/(\d+)\/migrate/);
          if (m) migrateOrgId = parseInt(m[1], 10);
        },
      },
    ]);

    await page.goto('/admin/b2c-migration');
    await expect(page.getByRole('heading', { name: /b2c migration/i })).toBeVisible();
    await expect(page.getByText('Acme Hospice')).toBeVisible();

    await page.getByRole('button', { name: /send invitations/i }).click();
    await expect.poll(() => migrateOrgId).toBe(1);
    await expect(page.getByText(/7 invited/)).toBeVisible();
  });

  test('disables the migrate button for already-migrated orgs', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/admin/b2c-migration/organizations',
        body: {
          data: [
            {
              orgId: 2,
              orgName: 'Beta Health',
              slug: 'beta',
              b2CMigrated: true,
              b2CMigratedAt: '2026-05-01T00:00:00Z',
              totalUsers: 5,
              activeUsers: 5,
            },
          ],
        },
      },
    ]);

    await page.goto('/admin/b2c-migration');
    await expect(page.getByRole('button', { name: /send invitations/i })).toBeDisabled();
  });
});
