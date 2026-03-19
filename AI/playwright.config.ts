import { defineConfig } from '@playwright/test';

import { config } from 'dotenv';

config({
  path: '.env',
});

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    extraHTTPHeaders: {
      'X-API-KEY': process.env.PLAYWRIGHT_API_KEY || '',
      'X-ORGANIZATION-ID': process.env.PLAYWRIGHT_ORGANIZATION_ID || '',
    },
    trace: 'retain-on-failure',
  },

  /* Configure global timeout for each test */
  timeout: 120 * 1000, // 120 seconds
  expect: {
    timeout: 120 * 1000,
  },

  /* Configure projects */
  projects: [
    {
      name: 'set up API access control testing',
      testMatch: /global\.api-access-control-setup\.ts/,
      teardown: 'clean up API access control testing',
    },
    {
      name: 'API Access Control testing',
      testMatch: '*apis/access-controls.spec.ts',
      dependencies: ['set up API access control testing'],
    },
    {
      name: 'clean up API access control testing',
      testMatch: /global\.api-access-control-teardown\.ts/,
    },
    {
      name: 'API testing',
      testMatch: '*apis/*.spec.ts',
      testIgnore: '*apis/access-controls.spec.ts',
    },
  ],
});