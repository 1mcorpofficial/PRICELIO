import { test, expect } from '@playwright/test';

test('landing loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.landing-brand')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
