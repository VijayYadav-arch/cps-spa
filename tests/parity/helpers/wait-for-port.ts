// @ts-nocheck -- node:net requires @types/node (intentionally absent in this Vite/browser project).
// This helper runs only inside Playwright's node-scoped fixture spawn flow, which is bundled by esbuild.
import { createConnection } from 'node:net';

export async function waitForPort(port: number, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise<boolean>((resolve) => {
      const sock = createConnection(port, '127.0.0.1', () => {
        sock.end();
        resolve(true);
      });
      sock.on('error', () => resolve(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Port ${port} did not open within ${timeoutMs}ms`);
}
