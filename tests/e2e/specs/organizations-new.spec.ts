import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/auth';
import { mockApi } from '../helpers/mock-api';

test.describe('NewOrganizationForm /admin/organizations/new (Step 4 Phase A PR #71)', () => {
  test('submits a new organization and navigates to detail', async ({ page }) => {
    await loginAsTestUser(page);
    let captured: { name?: string; slug?: string } | null = null;
    await mockApi(page, [
      {
        method: 'POST',
        path: '/organizations',
        status: 201,
        // orgsApi.create unwraps the body directly into OrganizationDetail
        // (no { data } envelope), see src/pages/Admin/Organizations/orgsApi.ts.
        body: {
          id: 99,
          name: 'New Hospice',
          slug: 'new-hospice',
          email: null,
          phone: null,
          address: null,
          taxId: null,
          active: true,
          isDeleted: false,
          parentOrganizationId: null,
          claimsCount: 0,
          patientsCount: 0,
          createdAt: '2026-06-04T00:00:00Z',
          updatedAt: '2026-06-04T00:00:00Z',
        },
        onMatch: async (route) => {
          captured = route.request().postDataJSON() as { name?: string; slug?: string };
        },
      },
      {
        method: 'GET',
        path: '/organizations/99',
        body: {
          data: {
            id: 99,
            name: 'New Hospice',
            slug: 'new-hospice',
            email: null,
            phone: null,
            address: null,
            taxId: null,
            active: true,
            isDeleted: false,
            parentOrganizationId: null,
            claimsCount: 0,
            patientsCount: 0,
            createdAt: '2026-06-04T00:00:00Z',
            updatedAt: '2026-06-04T00:00:00Z',
          },
        },
      },
    ]);

    await page.goto('/admin/organizations/new');
    await expect(page.getByRole('heading', { name: /new organization/i })).toBeVisible();

    await page.getByLabel(/^name \*$/i).fill('New Hospice');
    await page.getByLabel(/^slug \*$/i).fill('new-hospice');
    await page.getByRole('button', { name: /^create$/i }).click();

    await expect(page).toHaveURL(/\/admin\/organizations\/99$/);
    expect(captured).toMatchObject({ name: 'New Hospice', slug: 'new-hospice' });
  });

  test('blocks submit when required fields empty', async ({ page }) => {
    await loginAsTestUser(page);
    await mockApi(page, []);

    await page.goto('/admin/organizations/new');
    await page.getByRole('button', { name: /^create$/i }).click();

    await expect(page.getByText(/required/i).first()).toBeVisible();
  });
});
