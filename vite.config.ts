/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5025',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // tests/parity and tests/e2e are Playwright suites (run via `npm run
    // test:parity` / `test:e2e`) — they error under jsdom, so keep them out
    // of the default `vitest run` (unit) glob.
    exclude: [...configDefaults.exclude, 'tests/parity/**', 'tests/e2e/**'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
