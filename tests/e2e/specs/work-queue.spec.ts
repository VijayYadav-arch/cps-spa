import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

const STATS = { total: 5, pending: 3, inProgress: 1, critical: 2, overdue: 0 };

function item(id: number, priority = 'urgent') {
  return {
    id,
    type: 'denied',
    description: `Work item ${id}`,
    priority,
    status: 'pending',
    claimId: 100 + id,
    patientId: null,
    dueDate: '2026-06-30',
    assignedTo: null,
    snoozeUntilUtc: null,
    createdAt: '2026-06-04T00:00:00Z',
  };
}

test.describe('WorkQueuePage /billing/queue + /billing/work-queue (Step 6 PR #94)', () => {
  test('renders stats cards + items at /billing/queue', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/billing/work-queue',
        body: { data: [item(1), item(2, 'high')], stats: STATS },
      },
      { method: 'GET', path: '/billing/work-queue/stats', body: STATS },
    ]);

    await page.goto('/billing/queue');
    await expect(page.getByRole('heading', { name: /work queue/i })).toBeVisible();
    await expect(page.getByText('Work item 1')).toBeVisible();
    await expect(page.getByText('Work item 2')).toBeVisible();
  });

  test('switches to assigned-to-me filter and calls inbox endpoint', async ({ page }) => {
    await loginAsTestUser(page);
    let inboxCalled = false;
    await mockApi(page, [
      {
        method: 'GET',
        path: '/billing/work-queue/inbox',
        body: { data: [item(1)], stats: STATS },
        onMatch: () => {
          inboxCalled = true;
        },
      },
      { method: 'GET', path: '/billing/work-queue/stats', body: STATS },
      {
        method: 'GET',
        path: '/billing/work-queue',
        body: { data: [item(1), item(2)], stats: STATS },
      },
    ]);

    await page.goto('/billing/queue');
    await page.getByRole('tab', { name: /assigned to me/i }).click();

    await expect.poll(() => inboxCalled).toBe(true);
  });
});
