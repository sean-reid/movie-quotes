import { defineConfig, devices } from '@playwright/test';

const API_PORT = 8787;
const WEB_PORT = 5173;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: [
    {
      // Reset and seed the local D1, then serve the API against it.
      // CI=true keeps wrangler dev non-interactive so it does not exit on stdin EOF.
      command:
        'pnpm --filter @movie-quotes/api run db:reset && pnpm --filter @movie-quotes/api run db:seed && pnpm --filter @movie-quotes/api exec wrangler dev --port 8787 --local',
      url: `http://localhost:${API_PORT}/api/health`,
      env: { CI: 'true' },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @movie-quotes/web run dev',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
