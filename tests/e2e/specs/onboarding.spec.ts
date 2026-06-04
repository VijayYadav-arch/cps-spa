import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

const HOSPICE_FLOW = {
  careType: 'hospice',
  totalSteps: 2,
  steps: [
    { number: 1, title: 'Add patient', description: 'Onboard first patient.', required: true },
    { number: 2, title: 'Submit claim', description: 'Submit first claim.', required: false },
  ],
};

test.describe('OnboardingPage /admin/onboarding (Step 4 Group A PR #85)', () => {
  test('renders flow steps for default hospice care type', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, [
      { method: 'GET', path: '/onboarding/flow/hospice', body: { data: HOSPICE_FLOW } },
    ]);

    await page.goto('/admin/onboarding');
    await expect(page.getByRole('heading', { name: /^onboarding$/i })).toBeVisible();
    await expect(page.getByText('Add patient')).toBeVisible();
    await expect(page.getByText('Submit claim')).toBeVisible();
    await expect(page.getByRole('link', { name: /email-template sequence/i })).toHaveAttribute(
      'href',
      '/admin/onboarding/emails'
    );
  });

  test('switches care type and refetches', async ({ page }) => {
    await loginAsTestUser(page);
    let lastCareType: string | null = null;
    await mockApi(page, [
      {
        method: 'GET',
        path: '/onboarding/flow',
        body: { data: HOSPICE_FLOW },
        onMatch: (route) => {
          const m = new URL(route.request().url()).pathname.match(/\/onboarding\/flow\/([^/?]+)/);
          if (m) lastCareType = m[1];
        },
      },
    ]);

    await page.goto('/admin/onboarding');
    await page.getByRole('tab', { name: /palliative/i }).click();

    await expect.poll(() => lastCareType).toBe('palliative');
  });
});

test.describe('OnboardingEmailsPage /admin/onboarding/emails (Step 4 Group A PR #86)', () => {
  test('renders welcome-sequence summary + at least one template subject', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, []);

    await page.goto('/admin/onboarding/emails');
    await expect(page.getByRole('heading', { name: /email templates/i })).toBeVisible();
    await expect(page.getByTestId('email-summary')).toBeVisible();
    // Templates are statically bundled (data/onboardingEmailTemplates.ts) — at
    // least the day-0 welcome subject renders.
    await expect(page.getByText(/welcome to cps/i).first()).toBeVisible();
  });
});
