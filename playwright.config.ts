import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 120000, 
  expect: {
    timeout: 12000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit-report.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */

  use: {
    baseURL: 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login',
    headless: true,
    actionTimeout: 15000,
    navigationTimeout: 30000,
    deviceScaleFactor: undefined,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
   projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Uses bundled Chromium in Docker/CI, and branded Chrome locally
        channel: process.env.CI ? undefined : 'chrome',
        viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
        deviceScaleFactor: undefined,
        launchOptions: {
          args: process.env.CI ? [] : ['--start-maximized'],
        },
      },
    },
  ],
});
