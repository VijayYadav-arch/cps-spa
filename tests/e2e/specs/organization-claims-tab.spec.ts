import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

const ORG = {
  id: 1,
  name: 'Acme Hospice',
  slug: 'acme',
  email: null,
  phone: null,
  address: null,
  taxId: null,
  active: true,
  isDeleted: false,
  parentOrganizationId: null,
  claimsCount: 2,
  patientsCount: 5,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

function claim(id: number, status = 'pending') {
  return {
    id,
    patientName: `Patient ${id}`,
    status,
    amount: 100 * id,
    submittedDate: null,
    organizationId: 1,
    createdAt: '2026-06-04T00:00:00Z',
  };
}

test.describe('OrganizationClaimsTab /admin/organizations/:id/claims (Step 4 Phase B PR #74)', () => {
  test('renders org claims with cross-org-admin query override', async ({ page }) => {
    await loginAsTestUser(page);
    let claimsQuery: URLSearchParams | null = null;
    await mockApi(page, [
      // orgsApi.getById returns OrganizationDetail directly (no { data } envelope).
      { method: 'GET', path: '/organizations/1', body: ORG },
      {
        method: 'GET',
        path: '/claims',
        body: {
          data: [claim(1), claim(2, 'paid')],
          pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
        },
        onMatch: (route) => {
          claimsQuery = new URL(route.request().url()).searchParams;
        },
      },
    ]);

    await page.goto('/admin/organizations/1/claims');
    await expect(page.getByRole('heading', { name: /Acme Hospice.*Claims/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Patient 1' })).toBeVisible();
    expect(claimsQuery?.get('organizationId')).toBe('1');
  });

  test('switches status filter and refetches with status param', async ({ page }) => {
    await loginAsTestUser(page);
    const calls: string[] = [];
    await mockApi(page, [
      { method: 'GET', path: '/organizations/1', body: ORG },
      {
        method: 'GET',
        path: '/claims',
        body: { data: [], pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 } },
        onMatch: (route) => {
          calls.push(new URL(route.request().url()).searchParams.toString());
        },
      },
    ]);

    await page.goto('/admin/organizations/1/claims');
    await page.getByRole('combobox', { name: /status/i }).selectOption('paid');

    await expect.poll(() => calls.some((c) => c.includes('status=paid'))).toBe(true);
  });
});
