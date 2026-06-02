// @ts-nocheck -- node:* modules + Playwright worker-scoped fixtures require @types/node,
// which is intentionally not in this project's devDependencies (cps-spa is a Vite/browser app).
// Playwright's own runner uses esbuild and does not type-check, so this file executes fine at runtime.
// A future task can add @types/node + a dedicated tsconfig for tests/parity if stricter checking is desired.
import { test as base, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitForPort } from '../helpers/wait-for-port';

type DualAppFixture = {
  nextjs: { url: string };
  spa: { url: string };
};

// ESM compatibility: cps-spa's package.json declares "type": "module", so the CommonJS
// __dirname global is undefined. fileURLToPath(import.meta.url) gives the same value.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CPS_REPO = path.resolve(HERE, '../../../../cps');
const CPS_SPA_REPO = path.resolve(HERE, '../../..');

let nextProc: ChildProcess | undefined;
let spaProc: ChildProcess | undefined;

/**
 * Spawns BOTH apps once per worker: cps Next.js on :3030, cps-spa Vite preview on :5173.
 * Tests then make HTTP requests against each app independently for parity comparison.
 *
 * Prerequisites for local execution:
 * - cps repo: run `npm run build` in ../cps (Next.js requires a production build before `npm run start`)
 * - cps-spa repo: run `npm run build` here (Vite preview serves the dist/ folder)
 * - Docker is NOT required for the fixture itself, but most parity test backends need a running cps-dotnet
 *   (typically via Testcontainers Postgres in CI, or a local dev cps-dotnet on :5025).
 */
export const test = base.extend<{}, DualAppFixture>({
  nextjs: [async ({}, use) => {
    if (!nextProc) {
      nextProc = spawn('npm', ['run', 'start', '--', '--port', '3030'], {
        cwd: CPS_REPO,
        env: { ...process.env, PORT: '3030' },
        shell: true,
        stdio: 'pipe',
      });
      await waitForPort(3030);
    }
    await use({ url: 'http://localhost:3030' });
  }, { scope: 'worker' }],

  spa: [async ({}, use) => {
    if (!spaProc) {
      spaProc = spawn('npx', ['vite', 'preview', '--port', '5173', '--strictPort'], {
        cwd: CPS_SPA_REPO,
        shell: true,
        stdio: 'pipe',
      });
      await waitForPort(5173);
    }
    await use({ url: 'http://localhost:5173' });
  }, { scope: 'worker' }],
});

export { expect };

process.on('exit', () => {
  nextProc?.kill();
  spaProc?.kill();
});
