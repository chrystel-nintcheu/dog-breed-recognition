import { test, expect } from '@playwright/test';
import { mockCDN } from './helpers';

test.describe('Page structure', () => {
  test.beforeEach(async ({ page }) => {
    await mockCDN(page);
    await page.goto('/');
  });

  test('page title is "Dog Breed Recognition"', async ({ page }) => {
    await expect(page).toHaveTitle('Dog Breed Recognition');
  });

  test('h1 contains "Dog Breed Recognition"', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Dog Breed Recognition');
  });

  test('#file-input exists with accept="image/*"', async ({ page }) => {
    const input = page.locator('#file-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('accept', 'image/*');
  });

  test('#image exists with correct alt text', async ({ page }) => {
    const img = page.locator('#image');
    await expect(img).toHaveAttribute('alt', 'Upload an image for breed recognition');
  });

  test('#prediction element exists and is initially empty', async ({ page }) => {
    const prediction = page.locator('#prediction');
    await expect(prediction).toBeAttached();
    await expect(prediction).toHaveText('');
  });

  test('#input-error element exists and is initially empty', async ({ page }) => {
    const error = page.locator('#input-error');
    await expect(error).toBeAttached();
    await expect(error).toHaveText('');
  });

  test('style.css applies blue color to #prediction', async ({ page }) => {
    const color = await page.locator('#prediction').evaluate(
      (el) => getComputedStyle(el).color,
    );
    expect(color).toBe('rgb(0, 0, 255)');
  });

  test('TensorFlow.js script tag is present', async ({ page }) => {
    const tfScript = page.locator('script[src*="@tensorflow/tfjs"]');
    await expect(tfScript).toBeAttached();
  });

  test('MobileNet script tag is present', async ({ page }) => {
    const mnScript = page.locator('script[src*="@tensorflow-models/mobilenet"]');
    await expect(mnScript).toBeAttached();
  });

  test('app.js script tag is present', async ({ page }) => {
    const appScript = page.locator('script[src="app.js"]');
    await expect(appScript).toBeAttached();
  });
});
