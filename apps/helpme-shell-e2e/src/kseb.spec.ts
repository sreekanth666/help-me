import { test, expect, type Page } from '@playwright/test';

/**
 * End-to-end check of the KSEB calculator against the spec's reference
 * bills: the engine is unit-tested, so this proves the page wires inputs to
 * it and renders the result.
 */
test.describe('KSEB bill calculator', () => {
  // The theme toggle enables itself on mount, so it signals that React has
  // hydrated and will receive the inputs typed next.
  const hydrated = (page: Page) =>
    expect(page.getByRole('button', { name: /^Switch to/ })).toBeEnabled();

  test.beforeEach(async ({ page }) => {
    await page.goto('/kseb');
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
    await hydrated(page);
  });

  test('prices the Aug 2025 reference bill at ₹486', async ({ page }) => {
    await page.getByLabel('Month').fill('2025-08');
    await page.getByLabel('Previous reading').fill('1000');
    await page.getByLabel('Current reading').fill('1104');

    await expect(page.getByTestId('bill-total')).toHaveText('₹486');
    await expect(page.getByText('Exact')).toBeVisible();
  });

  test('bills a door-locked meter on assessed units', async ({ page }) => {
    await page.getByLabel('Month').fill('2025-10');
    await page.getByLabel('Meter status').selectOption('door_lock');
    await page.getByLabel('Or monthly average').fill('65');

    await expect(page.getByText('Assessed', { exact: true })).toBeVisible();
    await expect(page.getByTestId('bill-total')).toHaveText('₹599');
  });
});
