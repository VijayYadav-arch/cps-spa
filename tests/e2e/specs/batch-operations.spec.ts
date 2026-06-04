import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

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

test.describe('BatchOperationsPage /billing/batch (Step 6 PR #93)', () => {
  test('lists claims + enables submit after selection + posts to batch endpoint', async ({
    page,
  }) => {
    await loginAsTestUser(page);
    let submitCalled = false;
    await mockApi(page, [
      {
        method: 'GET',
        path: '/claims',
        body: {
          data: [claim(1), claim(2, 'submitted')],
          pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
        },
      },
      {
        method: 'POST',
        path: '/billing/batch/submit',
        body: { succeeded: [1, 2], failed: [] },
        onMatch: () => {
          submitCalled = true;
        },
      },
    ]);

    await page.goto('/billing/batch');
    await expect(page.getByRole('heading', { name: /batch operations/i })).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /submit selected/i });
    await expect(submitBtn).toBeDisabled();

    await page.getByLabel('Select all').check();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    await expect.poll(() => submitCalled).toBe(true);
    await expect(page.getByText(/submit result/i)).toBeVisible();
  });

  test('opens void-confirm dialog before posting', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/claims',
        body: {
          data: [claim(1)],
          pagination: { total: 1, page: 1, pageSize: 50, totalPages: 1 },
        },
      },
    ]);

    await page.goto('/billing/batch');
    await page.getByLabel('Select claim 1').check();
    await page.getByRole('button', { name: /void selected/i }).click();

    await expect(page.getByRole('dialog', { name: /confirm void/i })).toBeVisible();
  });
});
