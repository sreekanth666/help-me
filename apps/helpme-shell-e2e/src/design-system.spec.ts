import { test, expect, type Page } from '@playwright/test';

/**
 * These tests exist to catch the one failure the build cannot: Tailwind v4
 * scans only the project that imports it, so if @helpme/ui's sources are not
 * declared as a @source, every component renders completely unstyled while
 * the build still reports success. Asserting on computed styles is the only
 * way to tell the difference.
 */

const backgroundOf = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);

test.describe('shared design system', () => {
  test('renders library components with their theme styles applied', async ({
    page,
  }) => {
    await page.goto('/');

    const addExpense = page.getByRole('button', { name: 'Add expense' });
    await expect(addExpense).toBeVisible();

    // bg-primary is declared inside @helpme/ui, not in the app. An unstyled
    // button computes to a transparent background.
    const background = await addExpense.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
    expect(background).not.toBe('transparent');

    // Padding and radius come from the same class string, so a non-zero
    // radius proves the whole utility set resolved, not just colours.
    const radius = await addExpense.evaluate(
      (el) => getComputedStyle(el).borderRadius
    );
    expect(radius).not.toBe('0px');
  });

  test('opens the dialog and fires a toast', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Add expense' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: 'Add expense' })
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Design system is wired up.')).toBeVisible();
  });

  test('toggles dark mode and repaints from the shared tokens', async ({
    page,
  }) => {
    await page.goto('/');

    const html = page.locator('html');
    await expect(html).toHaveClass(/light|dark/);

    const before = await backgroundOf(page, 'body');
    const wasDark = (await html.getAttribute('class'))?.includes('dark');

    await page
      .getByRole('button', {
        name: wasDark ? 'Switch to light theme' : 'Switch to dark theme',
      })
      .click();

    await expect(html).toHaveClass(wasDark ? /light/ : /dark/);
    await expect
      .poll(() => backgroundOf(page, 'body'))
      .not.toBe(before);
  });

  test('hydrates without console errors', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        problems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));

    await page.goto('/');
    await expect(page.getByRole('table')).toBeVisible();

    expect(problems).toEqual([]);
  });
});
