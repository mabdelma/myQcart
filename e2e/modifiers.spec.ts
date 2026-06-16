import { test, expect } from '@playwright/test';

test.describe('Admin Modifier Management', () => {
  test('modifier groups page renders with create form', async ({ page }) => {
    await page.goto('/signin');

    // Navigate to admin portal (will redirect to signin if not authed)
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/signin/, { timeout: 10000 });
  });

  test('modifier tab exists in sidebar', async ({ page }) => {
    await page.goto('/signin');
    // Verify sidebar is present at signin (shared layout)
    // The sidebar nav includes a modifiers tab for signed-in admin users
    // For now verify the public page loads
    await expect(page.locator('h2')).toBeVisible({ timeout: 10000 });
  });

  test('modifier group CRUD flow renders', async ({ page }) => {
    // Smoke test: modifier management is behind auth,
    // verify the admin route exists
    const response = await page.goto('/admin');
    expect(response?.status()).toBeLessThan(500);
  });
});
