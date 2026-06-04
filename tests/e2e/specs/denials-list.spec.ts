import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

function buildDenial(id: number, status = 'new', category = 'medical-necessity') {
  return {
    id,
    claimId: 100 + id,
    organizationId: 1,
    status,
    denialCode: 'CO-50',
    denialReason: `Not medically necessary ${id}`,
    category,
    appealDeadline: '2026-07-01',
    resolvedAt: null,
    assignedTo: null,
    appealHistory: null,
    createdAt: '2026-06-04T00:00:00Z',
    updatedAt: '2026-06-04T00:00:00Z',
  };
}

test.describe('DenialsList /billing/denials (Step 4 PR #80)', () => {
  test('renders status tabs + items + back-link to queue', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/billing/denials',
        body: {
          data: [buildDenial(1), buildDenial(2, 'appealing', 'auth')],
          pagination: { total: 2, page: 1, pageSize: 50 },
        },
      },
    ]);

    await page.goto('/billing/denials');
    await expect(page.getByRole('heading', { name: /denial management/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /view aging queue/i })).toHaveAttribute(
      'href',
      '/billing/denials/queue'
    );
    // md+ table renders denials as <td>s; mobile-card variant is display:none
    // at Playwright's default desktop viewport.
    await expect(page.getByRole('cell', { name: 'Not medically necessary 1' })).toBeVisible();
  });

  test('switches status filter and re-fetches with status param', async ({ page }) => {
    await loginAsTestUser(page);
    const calls: string[] = [];
    await mockApi(page, [
      {
        method: 'GET',
        path: '/billing/denials',
        body: { data: [], pagination: { total: 0, page: 1, pageSize: 50 } },
        onMatch: (route) => {
          calls.push(new URL(route.request().url()).searchParams.toString());
        },
      },
    ]);

    await page.goto('/billing/denials');
    await page.getByRole('tab', { name: 'Appealing' }).click();
    await page.waitForLoadState('networkidle');

    expect(calls.some((c) => c.includes('status=appealing'))).toBe(true);
  });
});
