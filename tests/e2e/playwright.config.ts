// @ts-nocheck — node:* + Playwright worker fixtures require @types/node, intentionally absent from cps-spa devDeps.
// Playwright's esbuild runner does not type-check this file at runtime.
//
// E2E config — separate from the parity infra (tests/parity). This suite runs
// against a single cps-spa dev server with dev-claims auth bypass + network-
// level API mocking via page.route. No cps Next.js or cps-dotnet processes
// are launched.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    actionTimeout: 5_000,
    screenshot: 'only-on-failure',
  },
  webServer: {
    // Vite dev server with VITE_DEV_LOGIN=true forces AuthContext into the
    // dev-claims branch — tests set claims via sessionStorage.
    //
    // `--host 127.0.0.1` forces IPv4 binding; Playwright's url polling on
    // Windows defaults to IPv4 and Vite otherwise prefers ::1.
    // Timeout is generous because the first-ever boot triggers Vite to
    // optimize deps; subsequent boots take ~2s.
    command: 'npm run dev -- --port 5173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      VITE_DEV_LOGIN: 'true',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
