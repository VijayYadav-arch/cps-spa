import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

test.describe('BillingCodesPage /billing/codes (Step 6 PR #92)', () => {
  test('loads default result set + back-link + filters', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/billing/codes',
        body: {
          data: [
            { code: 'I50.9', description: 'Heart failure, unspecified', type: 'icd10', category: 'general' },
            { code: '99213', description: 'Office visit', type: 'cpt', category: 'hospice' },
          ],
          count: 2,
        },
      },
    ]);

    await page.goto('/billing/codes');
    await expect(page.getByRole('heading', { name: /billing code lookup/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to billing/i })).toHaveAttribute('href', '/billing');
    await expect(page.getByText('I50.9')).toBeVisible();
    await expect(page.getByText('99213')).toBeVisible();
  });

  test('passes type filter as query param', async ({ page }) => {
    await loginAsTestUser(page);
    const lastParams: { value?: string } = {};
    await mockApi(page, [
      {
        method: 'GET',
        path: '/billing/codes',
        body: { data: [], count: 0 },
        onMatch: (route) => {
          lastParams.value = new URL(route.request().url()).searchParams.toString();
        },
      },
    ]);

    await page.goto('/billing/codes');
    await page.getByRole('combobox', { name: /code type/i }).selectOption('cpt');
    await page.waitForLoadState('networkidle');

    expect(lastParams.value).toContain('type=cpt');
  });
});
