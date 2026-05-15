import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: {
      'X-Tenant-ID': process.env.PLAYWRIGHT_TENANT_ID ?? 'test-tenant-uuid',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start the Next.js dev server automatically during local runs
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        port: 3002,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
