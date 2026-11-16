import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { apiDevServer } from './scripts/api-dev-server.js';

export default defineConfig({
  plugins: [react(), apiDevServer()],
  build: { target: 'es2022' },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
      thresholds: { lines: 100, statements: 100, functions: 100, branches: 100 },
    },
  },
});
