/// <reference types="node" />

import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './tests',

  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,

  timeout: 60_000,

  expect: {
    timeout: 10_000,
  },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  use: {
    baseURL: 'https://tst.lebane.app',

    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],

        // Para esta prueba usamos Google Chrome instalado.
        channel: 'chrome',
      },
    },
  ],
});