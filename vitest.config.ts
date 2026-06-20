import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    css: true,
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/.next/**', '**/e2e/**', '**/playwright-report/**'],
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./test/vitest.setup.ts'],
  },
});
