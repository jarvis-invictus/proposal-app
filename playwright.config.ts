import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Playwright's own process doesn't load .env.local the way Next.js's dev server does — same
// reason vitest.setup.ts does this for the unit/integration suite. Without it, the specs'
// canSeed check always sees undefined and every test silently skips.
config({ path: '.env.local' })

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Reuses a dev server that's already running locally, starts one otherwise. CI never reuses.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
