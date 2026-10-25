import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test('serves at / and links through to the KSEB calculator', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: 'Help Me', level: 1 })
    ).toBeVisible();

    await page.getByRole('link', { name: /KSEB Bill Calculator/ }).click();
    await expect(page).toHaveURL(/\/kseb$/);
  });
});
