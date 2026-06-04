// @ts-nocheck — Playwright runner provides node context; cps-spa intentionally lacks @types/node.
import type { Page } from '@playwright/test';

/**
 * Seeds the dev-claims sessionStorage entry that AuthContext (dev branch)
 * picks up AND installs a default `/me` mock so RoleRoute / useUserRoles
 * see the same claims via TanStack Query. Works when the cps-spa dev
 * server runs with VITE_DEV_LOGIN=true.
 *
 * Default actor is a system_admin with broad permissions matching the
 * routes we test. Override per spec when narrower scoping matters.
 *
 * Always call this BEFORE the spec's `mockApi(...)` call; the auth helper
 * installs a `/me`-only route. Subsequent `mockApi` calls augment the
 * routes for other endpoints.
 */
export async function loginAsTestUser(
  page: Page,
  overrides: Partial<DevClaims> = {}
): Promise<void> {
  const claims: DevClaims = {
    userId: 1,
    organizationId: 1,
    roles: ['system_admin'],
    permissions: [
      'admin:dashboard',
      'admin:manage_orgs',
      'admin:manage_users',
      'admin:manage_roles',
      'admin:audit_logs',
      'admin:system_config',
      'admin:import',
      'admin:manage_branches',
      'claims:view',
      'claims:create',
      'claims:submit',
      'claims:edit',
      'claims:void',
      'claims:print',
      'patients:view',
      'patients:create',
      'patients:edit',
      'patients:intake',
      'billing:scrub',
      'billing:era',
      'billing:denials',
      'billing:statements',
      'billing:codes',
      'billing:queue',
      'billing:batch',
      'billing:superbills',
      'billing:ar-followup',
      'clinical:visit_notes',
      'clinical:medications',
      'clinical:orders',
      'clinical:referrals',
      'clinical:quality',
      'compliance:phi_review',
      'compliance:surveyor_export',
      'platform:onboarding',
      'reports:view',
      'hospice:manage',
      'hospice:view',
    ],
    ...overrides,
  };

  // Install /me mock first — it must be in place before any route navigation
  // that triggers useUserRoles. page.route() rules persist across navigations.
  await page.route(/\/api\/v2\/me(\?|$)/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: claims.userId,
        email: 'e2e-test@example.com',
        organizationId: claims.organizationId ?? null,
        organizationName: 'Test Org',
        roles: claims.roles,
        permissions: claims.permissions,
        serverTime: new Date().toISOString(),
      }),
    });
  });

  await page.goto('/');
  await page.evaluate((c) => {
    sessionStorage.setItem('cps_dev_claims', JSON.stringify(c));
  }, claims);
  await page.reload();
}

interface DevClaims {
  userId: number;
  organizationId?: number;
  roles: string[];
  permissions: string[];
}
