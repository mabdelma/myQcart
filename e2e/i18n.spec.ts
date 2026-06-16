import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('default locale is English', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/turn every table/i);
    const locale = await page.evaluate(() => localStorage.getItem('locale'));
    expect(locale === 'en' || locale === null).toBeTruthy();
  });

  test('switch to Arabic', async ({ page }) => {
    await page.locator('button[aria-label="Switch language"]').click();
    await page.getByRole('button', { name: 'العربية' }).click();
    await page.waitForTimeout(300);
    const locale = await page.evaluate(() => localStorage.getItem('locale'));
    expect(locale).toBe('ar');
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('rtl');
    await expect(page.locator('h1')).not.toBeEmpty();
  });

  test('switch to Spanish', async ({ page }) => {
    await page.locator('button[aria-label="Switch language"]').click();
    await page.getByRole('button', { name: 'Español' }).click();
    await page.waitForTimeout(300);
    const locale = await page.evaluate(() => localStorage.getItem('locale'));
    expect(locale).toBe('es');
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('ltr');
    await expect(page.locator('h1')).not.toBeEmpty();
  });

  test('switch to French', async ({ page }) => {
    await page.locator('button[aria-label="Switch language"]').click();
    await page.getByRole('button', { name: 'Français' }).click();
    await page.waitForTimeout(300);
    const locale = await page.evaluate(() => localStorage.getItem('locale'));
    expect(locale).toBe('fr');
    await expect(page.locator('h1')).not.toBeEmpty();
  });

  test('switch to German', async ({ page }) => {
    await page.locator('button[aria-label="Switch language"]').click();
    await page.getByRole('button', { name: 'Deutsch' }).click();
    await page.waitForTimeout(300);
    const locale = await page.evaluate(() => localStorage.getItem('locale'));
    expect(locale).toBe('de');
    await expect(page.locator('h1')).not.toBeEmpty();
  });

  test('switch to Portuguese', async ({ page }) => {
    await page.locator('button[aria-label="Switch language"]').click();
    await page.getByRole('button', { name: 'Português' }).click();
    await page.waitForTimeout(300);
    const locale = await page.evaluate(() => localStorage.getItem('locale'));
    expect(locale).toBe('pt');
    await expect(page.locator('h1')).not.toBeEmpty();
  });

  test('switch to Chinese', async ({ page }) => {
    await page.locator('button[aria-label="Switch language"]').click();
    await page.getByRole('button', { name: '中文' }).click();
    await page.waitForTimeout(300);
    const locale = await page.evaluate(() => localStorage.getItem('locale'));
    expect(locale).toBe('zh');
    await expect(page.locator('h1')).not.toBeEmpty();
  });

  test('switch to Hindi', async ({ page }) => {
    await page.locator('button[aria-label="Switch language"]').click();
    await page.getByRole('button', { name: 'हिन्दी' }).click();
    await page.waitForTimeout(300);
    const locale = await page.evaluate(() => localStorage.getItem('locale'));
    expect(locale).toBe('hi');
    await expect(page.locator('h1')).not.toBeEmpty();
  });

  test('switch to Russian', async ({ page }) => {
    await page.locator('button[aria-label="Switch language"]').click();
    await page.getByRole('button', { name: 'Русский' }).click();
    await page.waitForTimeout(300);
    const locale = await page.evaluate(() => localStorage.getItem('locale'));
    expect(locale).toBe('ru');
    await expect(page.locator('h1')).not.toBeEmpty();
  });

  test('switch to Japanese', async ({ page }) => {
    await page.locator('button[aria-label="Switch language"]').click();
    await page.getByRole('button', { name: '日本語' }).click();
    await page.waitForTimeout(300);
    const locale = await page.evaluate(() => localStorage.getItem('locale'));
    expect(locale).toBe('ja');
    await expect(page.locator('h1')).not.toBeEmpty();
  });

  test('locale persists across page reload', async ({ page }) => {
    await page.locator('button[aria-label="Switch language"]').click();
    await page.getByRole('button', { name: 'Français' }).click();
    await page.waitForTimeout(300);
    const localeBefore = await page.evaluate(() => localStorage.getItem('locale'));
    expect(localeBefore).toBe('fr');

    await page.reload();
    await page.waitForTimeout(300);
    const localeAfter = await page.evaluate(() => localStorage.getItem('locale'));
    expect(localeAfter).toBe('fr');
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe('ltr');
    await expect(page.locator('h1')).not.toBeEmpty();
  });

  test('language switcher is visible on home page', async ({ page }) => {
    const switcher = page.locator('button[aria-label="Switch language"]');
    await expect(switcher).toBeVisible();
  });

  test('language switcher is visible on restaurant page', async ({ page }) => {
    await page.goto('/r/demo-cafe');
    await page.waitForTimeout(1000);
    const switcher = page.locator('button[aria-label="Switch language"]');
    await expect(switcher).toBeVisible();
  });
});
