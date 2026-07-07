import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 300 * 1000, // 5 minutes max for the whole presentation
  expect: {
    timeout: 10000
  },
  fullyParallel: false, // Run one by one for presentation
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    // We want the presentation to be visible!
    headless: false,
    // Add some delay so humans can watch the bot click and type
    launchOptions: {
      slowMo: 600, // Wait 600ms between actions
    },
    viewport: { width: 1280, height: 720 },
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
