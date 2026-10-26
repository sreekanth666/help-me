import { test, expect, type Page } from '@playwright/test';

/**
 * The converter and the clipboard writer are unit-tested; this proves the
 * page wires the textarea to the preview and that Copy puts Word-ready
 * `text/html` on the real clipboard.
 */
test.describe('Markdown to Word', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  // The theme toggle enables itself on mount, so it signals that React has hydrated.
  const hydrated = (page: Page) =>
    expect(page.getByRole('button', { name: /^Switch to/ })).toBeEnabled();

  test.beforeEach(async ({ page }) => {
    await page.goto('/markdown-to-word');
    await hydrated(page);
  });

  test('previews pasted Markdown as formatted content', async ({ page }) => {
    await page
      .getByLabel('Markdown', { exact: true })
      .fill('# Report\n\n- one\n- two\n\n| A | B |\n|---|---|\n| 1 | 2 |');

    const preview = page.getByTestId('preview');
    await expect(
      preview.getByRole('heading', { name: 'Report' }),
    ).toBeVisible();
    await expect(preview.getByRole('listitem')).toHaveCount(2);
    await expect(preview.getByRole('table')).toBeVisible();
  });

  test('copies Word-ready HTML to the clipboard', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /Copy for Word/ }),
    ).toBeDisabled();
    await page
      .getByLabel('Markdown', { exact: true })
      .fill('# Report\n\n**bold** text');
    await page.getByRole('button', { name: /Copy for Word/ }).click();
    await expect(page.getByText(/Copied/)).toBeVisible();

    const html = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      return (await item.getType('text/html')).text();
    });
    expect(html).toMatch(/<h1 [^>]*Calibri Light[^>]*>Report<\/h1>/);
    expect(html).toContain('<strong>bold</strong>');
  });

  test('is reachable from the landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Markdown to Word/ }).click();
    await expect(page).toHaveURL(/\/markdown-to-word$/);
  });
});
