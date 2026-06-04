import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

function encounter(id: number) {
  return {
    id,
    patientId: 100 + id,
    patientFirstName: `First${id}`,
    patientLastName: `Last${id}`,
    organizationId: 1,
    organizationName: 'Acme Hospice',
    visitDate: '2026-06-04',
    provider: 'Dr. Smith',
    visitType: 'routine',
    notes: null,
    createdAt: '2026-06-04T00:00:00Z',
  };
}

test.describe('EncountersList /admin/encounters (Step 4 PR #73)', () => {
  test('renders encounter rows', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/encounters',
        body: {
          data: [encounter(1), encounter(2)],
          pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
        },
      },
    ]);

    await page.goto('/admin/encounters');
    await expect(page.getByRole('heading', { name: /encounters/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /First1 Last1/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /First2 Last2/i })).toBeVisible();
  });

  test('shows empty state when no encounters', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/encounters',
        body: { data: [], pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 } },
      },
    ]);

    await page.goto('/admin/encounters');
    await expect(page.getByText(/no encounters/i)).toBeVisible();
  });
});
