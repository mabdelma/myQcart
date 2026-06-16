import { test, expect } from '@playwright/test';

test.describe('Loyalty & Promotions', () => {
  test('promo code input renders in checkout', async ({ page }) => {
    const BASE = '/r/demo-cafe/table/table-1';
    await page.goto(`${BASE}/bill`);
    await expect(page.locator('h2')).toBeVisible({ timeout: 10000 });

    // Promo code section should exist
    await expect(page.getByPlaceholder(/enter promo code/i)).toBeVisible();
  });

  test('loyalty admin route exists', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.locator('h2')).toBeVisible({ timeout: 10000 });
    // Loyalty page is behind auth — verify the route doesn't error
    const response = await page.goto('/admin/loyalty');
    expect(response?.status()).toBeLessThan(500);
  });

  test('promo code validation endpoint responds', async ({ page }) => {
    const response = await page.goto('/api/r/demo-cafe/promo/validate?code=INVALID');
    // Should respond with JSON error (4xx)
    expect(response?.status()).toBe(401);
  });
});
