import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 1440, height: 900 },
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
