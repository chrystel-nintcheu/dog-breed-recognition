import { test, expect } from '@playwright/test';
import { mockCDN, VALID_PNG_FILE, INVALID_TXT_FILE } from './helpers';

test.describe('File upload interactions', () => {
  test.beforeEach(async ({ page }) => {
    await mockCDN(page);
    await page.goto('/');
  });

  test('valid image upload sets #image src to data URL', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(VALID_PNG_FILE);
    await expect(page.locator('#image')).toHaveAttribute('src', /^data:image\/png;base64,/, { timeout: 5_000 });
  });

  test('valid image upload shows no error', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(VALID_PNG_FILE);
    // Wait for image to load first (proves upload completed)
    await expect(page.locator('#image')).toHaveAttribute('src', /^data:/, { timeout: 5_000 });
    await expect(page.locator('#input-error')).toHaveText('');
  });

  test('valid image upload triggers classification with mock model', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(VALID_PNG_FILE);
    await expect(page.locator('#prediction')).toContainText('mock-golden-retriever', { timeout: 10_000 });
  });

  test('invalid file upload shows error message', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(INVALID_TXT_FILE);
    await expect(page.locator('#input-error')).toHaveText('Please upload a valid image file.');
  });

  test('invalid file upload does not change #image src', async ({ page }) => {
    const srcBefore = await page.locator('#image').getAttribute('src');
    await page.locator('#file-input').setInputFiles(INVALID_TXT_FILE);
    // Wait a moment for any async side effects
    await page.waitForTimeout(500);
    const srcAfter = await page.locator('#image').getAttribute('src');
    expect(srcAfter).toBe(srcBefore);
  });
});
