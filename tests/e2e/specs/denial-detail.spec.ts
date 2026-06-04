import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

function denial(overrides: { status?: string; appealHistory?: string | null } = {}) {
  return {
    id: 7,
    claimId: 42,
    organizationId: 1,
    status: overrides.status ?? 'new',
    denialCode: 'CO-50',
    denialReason: 'Service not covered.',
    category: 'medical-necessity',
    payerName: 'Medicare',
    appealDeadline: '2026-07-01',
    resolvedAt: null,
    assignedTo: null,
    appealHistory: overrides.appealHistory ?? null,
    createdAt: '2026-06-04T00:00:00Z',
    updatedAt: '2026-06-04T00:00:00Z',
  };
}

const ANALYSIS = {
  category: 'medical-necessity',
  description: 'Not medically necessary',
  appealDeadline: '2026-07-15',
  recommendedAction: 'Gather medical records and submit appeal.',
  appealTemplate: 'Dear Payer, please reconsider...',
};

test.describe('DenialDetail /billing/denials/:id (Step 4 PR #81)', () => {
  test('renders header, CARC analysis, and conditional appeal action', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      { method: 'GET', path: '/billing/denials/7', body: { data: denial() } },
      { method: 'POST', path: '/billing/denials/analyze', body: { data: ANALYSIS } },
    ]);

    await page.goto('/billing/denials/7');
    await expect(page.getByRole('heading', { name: /claim #42/i })).toBeVisible();
    await expect(page.getByText('CO-50')).toBeVisible();
    await expect(page.getByText(/CARC Analysis/i)).toBeVisible();
    await expect(page.getByText(/gather medical records/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /start appeal/i })).toBeVisible();
  });

  test('opens action modal and submits appeal with notes', async ({ page }) => {
    await loginAsTestUser(page);
    let appealNotes: string | null = null;
    await mockApi(page, [
      { method: 'GET', path: '/billing/denials/7', body: { data: denial() } },
      { method: 'POST', path: '/billing/denials/analyze', body: { data: ANALYSIS } },
      {
        method: 'PUT',
        path: '/billing/denials/7/appeal',
        body: { data: { ...denial(), status: 'in-review' } },
        onMatch: async (route) => {
          const body = route.request().postDataJSON() as { notes?: string };
          appealNotes = body?.notes ?? null;
        },
      },
    ]);

    await page.goto('/billing/denials/7');
    await page.getByRole('button', { name: /start appeal/i }).click();
    await expect(page.getByRole('dialog', { name: /start appeal/i })).toBeVisible();
    await page.getByRole('textbox').fill('Submitting records');
    await page.getByRole('button', { name: /confirm/i }).click();

    await expect.poll(() => appealNotes).toBe('Submitting records');
  });

  test('shows resolved banner when status is resolved', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      {
        method: 'GET',
        path: '/billing/denials/7',
        body: { data: { ...denial({ status: 'resolved' }), resolvedAt: '2026-06-03T00:00:00Z' } },
      },
      { method: 'POST', path: '/billing/denials/analyze', body: { data: ANALYSIS } },
    ]);

    await page.goto('/billing/denials/7');
    await expect(page.getByText(/^Resolved/)).toBeVisible();
    await expect(page.getByRole('button', { name: /start appeal/i })).not.toBeVisible();
  });
});
