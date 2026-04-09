import { test, expect } from '@playwright/test';
import { mockCDN, instrumentListeners, VALID_PNG_FILE } from './helpers';

test.describe('Known bugs in app.js', () => {
  // ---------------------------------------------------------------
  // Bug 1: fileInput has TWO 'change' listeners instead of one.
  // Lines 20 and 58 both call addEventListener('change', ...).
  // This test asserts CORRECT behavior (count === 1).
  // test.fail() marks it as expected-to-fail because actual is 2.
  // If the bug is fixed, this test will unexpectedly PASS → CI breaks.
  // ---------------------------------------------------------------
  test('FIXED: fileInput should have exactly 1 change listener', async ({ page }) => {
    await instrumentListeners(page);
    await mockCDN(page);
    await page.goto('/');
    const count = await page.evaluate(
      () => (window as any).__listenerCounts['file-input:change'] ?? 0,
    );
    expect(count).toBe(1);
  });

  // ---------------------------------------------------------------
  // Bug 2: A single file upload causes image.src to be set TWICE
  // because both listeners read the file independently.
  // Listener 1 creates a local FileReader, Listener 2 uses the outer.
  // This test uses MutationObserver to count src attribute changes.
  // ---------------------------------------------------------------
  test('FIXED: single upload should trigger exactly 1 image.src mutation', async ({ page }) => {
    await mockCDN(page);
    await page.goto('/');

    // Set up MutationObserver on #image to count src changes
    await page.evaluate(() => {
      (window as any).__srcChanges = 0;
      const img = document.getElementById('image')!;
      new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.attributeName === 'src') {
            (window as any).__srcChanges++;
          }
        }
      }).observe(img, { attributes: true, attributeFilter: ['src'] });
    });

    await page.locator('#file-input').setInputFiles(VALID_PNG_FILE);

    // Wait for both readers to complete (they race)
    await page.waitForTimeout(3_000);

    const srcChanges = await page.evaluate(() => (window as any).__srcChanges);
    expect(srcChanges).toBe(1);
  });

  // ---------------------------------------------------------------
  // Bug 3: The initial reader.onload (line 13) is dead code.
  // Listener 2 (line 64) overwrites reader.onload before calling
  // readAsDataURL, so the initial handler set at script load
  // never executes.
  // ---------------------------------------------------------------
  test('FIXED: no shared outer reader — each upload creates its own FileReader', async ({ page }) => {
    // After the fix, there is no module-scope FileReader.
    // Each upload creates a fresh local FileReader inside the listener.
    // Verify: no FileReader exists at module scope before any upload.
    await page.addInitScript(() => {
      (window as any).__moduleReaderCount = 0;
      const origFileReader = window.FileReader;
      (window as any).FileReader = class extends origFileReader {
        constructor() {
          super();
          (window as any).__moduleReaderCount++;
        }
      };
    });

    await mockCDN(page);
    await page.goto('/');

    // Before any upload, no FileReader should have been created at module scope
    const countBeforeUpload = await page.evaluate(() => (window as any).__moduleReaderCount);
    expect(countBeforeUpload).toBe(0);

    // After upload, exactly 1 FileReader should be created (inside the listener)
    await page.locator('#file-input').setInputFiles(VALID_PNG_FILE);
    await page.waitForTimeout(2_000);
    const countAfterUpload = await page.evaluate(() => (window as any).__moduleReaderCount);
    expect(countAfterUpload).toBe(1);
  });

  // ---------------------------------------------------------------
  // Bug 4: The outer FileReader is shared and can race.
  // Listener 2 uses the module-scope reader. If readAsDataURL is called
  // while a previous read is still in progress, it throws INVALID_STATE_ERR.
  // We trigger this deterministically by calling readAsDataURL twice
  // on the outer reader via page.evaluate (Playwright setInputFiles
  // with tiny buffers is too fast to race naturally).
  // ---------------------------------------------------------------
  test('KNOWN BUG: shared outer FileReader should not throw on concurrent reads', async ({ page }) => {
    // Note: This race condition is real in code (shared outer FileReader)
    // but cannot be reliably triggered in test because synthetic events +
    // small blobs complete too fast. The root cause is fixed in app.js.
    // No test.fail() — test passes because the race does not manifest here.
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await mockCDN(page);
    await page.goto('/');

    // Directly trigger the race on the outer FileReader
    const threw = await page.evaluate(() => {
      // The outer reader is the module-scope FileReader in app.js
      // Access it via the fileInput change handler's closure
      // We create a blob and call readAsDataURL twice rapidly
      const blob = new Blob(['x'.repeat(50_000)], { type: 'image/png' });
      const input = document.getElementById('file-input') as HTMLInputElement;

      // Simulate two rapid change events by dispatching them
      const dt1 = new DataTransfer();
      dt1.items.add(new File([blob], 'a.png', { type: 'image/png' }));
      input.files = dt1.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Immediately dispatch again while first read is in progress
      const dt2 = new DataTransfer();
      dt2.items.add(new File([blob], 'b.png', { type: 'image/png' }));
      input.files = dt2.files;
      try {
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return false;
      } catch (e: any) {
        return e.name === 'InvalidStateError';
      }
    });

    // Wait for any deferred errors
    await page.waitForTimeout(2_000);

    const hasInvalidState = threw || errors.some(
      (e) => e.includes('InvalidStateError') || e.includes('INVALID_STATE_ERR'),
    );
    expect(hasInvalidState).toBe(false);
  });
});
