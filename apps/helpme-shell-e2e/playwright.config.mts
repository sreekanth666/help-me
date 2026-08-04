import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:3000';

const workspaceRoot = join(import.meta.dirname, '../..');
const outputRoot = join(workspaceRoot, 'dist/.playwright/apps/helpme-shell-e2e');

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Generated as a .mts file so Node forces ESM regardless of workspace
 * `type`. Playwright routes `.mts` through its ESM loader.
 *
 * This deliberately does NOT use `nxE2EPreset`/`workspaceRoot` from
 * @nx/playwright and @nx/devkit. Importing them drags Nx's native binding
 * through Playwright's ESM require path, where it throws
 * "Cannot convert undefined or null to object" before any test runs. The
 * handful of settings the preset supplied are inlined below instead.
 */
export default defineConfig({
  testDir: './src',
  outputDir: join(outputRoot, 'test-output'),
  reporter: [
    ['list'],
    ['html', { outputFolder: join(outputRoot, 'playwright-report'), open: 'never' }],
  ],
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm exec nx run helpme-shell:dev',
    url: baseURL,
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Firefox and WebKit are intentionally omitted: their Playwright
    // browsers are not installed here, so enabling them fails the suite
    // rather than testing anything. Add them back alongside
    // `pnpm exec playwright install firefox webkit`.
  ],
});
