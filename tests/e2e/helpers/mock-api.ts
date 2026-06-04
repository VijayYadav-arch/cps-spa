// @ts-nocheck
import type { Page, Route } from '@playwright/test';

/**
 * Mock the cps-dotnet API at the network layer. apiClient targets relative
 * paths under /api/v2; we route those to canned responses.
 *
 * Pattern: `mockApi(page, { method: 'GET', path: '/claims', body: {...} })`.
 *
 * Unmatched requests fall through to the real network (which will fail in CI
 * since there's no cps-dotnet running) — keep the mocks comprehensive.
 */
export async function mockApi(
  page: Page,
  rules: Array<{
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string | RegExp;
    body?: unknown;
    status?: number;
    onMatch?: (route: Route) => void | Promise<void>;
  }>
): Promise<void> {
  // Match /api/v2/* EXCEPT /api/v2/me — loginAsTestUser owns the /me route
  // (called before mockApi). Playwright resolves routes in REVERSE registration
  // order, so excluding /me here keeps the auth helper's route authoritative.
  await page.route(/\/api\/v2\/(?!me(\?|$)).+/, async (route) => {
    const url = new URL(route.request().url());
    const pathOnly = url.pathname.replace(/^\/api\/v2/, '');
    const reqMethod = route.request().method();

    for (const rule of rules) {
      const methodOk = !rule.method || rule.method === reqMethod;
      const pathOk =
        typeof rule.path === 'string'
          ? pathOnly === rule.path || pathOnly.startsWith(rule.path)
          : rule.path.test(pathOnly);
      if (methodOk && pathOk) {
        if (rule.onMatch) await rule.onMatch(route);
        await route.fulfill({
          status: rule.status ?? 200,
          contentType: 'application/json',
          body: JSON.stringify(rule.body ?? {}),
        });
        return;
      }
    }
    // Default: return empty success — keeps tests from hanging on missing mocks.
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], pagination: { total: 0, page: 1, pageSize: 50 } }),
    });
  });
}
