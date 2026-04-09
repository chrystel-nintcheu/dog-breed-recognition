import { test, expect } from '@playwright/test';
import { VALID_PNG_FILE } from './helpers';

// Real CDN — no mocking. TF.js + MobileNet loaded over network.
// test.slow() triples the default timeout (60s → 180s).

test.describe('Real CDN classification', () => {
  test.slow();

  test('page loads without unhandled promise rejections', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/', { waitUntil: 'networkidle' });
    // Filter out non-critical noise — only check for unhandled rejections
    const critical = errors.filter(
      (e) => e.includes('Unhandled') || e.includes('unhandled'),
    );
    expect(critical).toHaveLength(0);
  });

  test('mobilenet global is defined after page load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const type = await page.evaluate(() => typeof (window as any).mobilenet);
    expect(type).toBe('object');
  });

  test('upload image produces real classification prediction', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('#file-input').setInputFiles(VALID_PNG_FILE);
    await expect(page.locator('#prediction')).toHaveText(
      /I am \d+% sure this is a .+\./,
      { timeout: 120_000 },
    );
  });

  test('no error message after classification completes', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('#file-input').setInputFiles(VALID_PNG_FILE);
    // Wait for prediction to appear first
    await expect(page.locator('#prediction')).toHaveText(
      /I am \d+% sure this is a .+\./,
      { timeout: 120_000 },
    );
    await expect(page.locator('#input-error')).toHaveText('');
  });
});
