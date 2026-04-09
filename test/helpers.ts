import { Page } from '@playwright/test';

// --- Minimal 1x1 red pixel PNG (no fixture files on disk) ---
const VALID_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

export const VALID_PNG_BUFFER = Buffer.from(VALID_PNG_BASE64, 'base64');

export const VALID_PNG_FILE = {
  name: 'test.png',
  mimeType: 'image/png',
  buffer: VALID_PNG_BUFFER,
};

export const INVALID_TXT_FILE = {
  name: 'test.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('not an image'),
};

// --- Functional CDN stub ---
// Prevents ReferenceError on `mobilenet` while allowing the full
// upload → classifyImage → displayPredictions flow to execute cleanly.

const TF_STUB = `window.tf = { ready: async () => true };`;

const MOBILENET_STUB = `
window.mobilenet = {
  load: async function () {
    return {
      classify: async function () {
        return [{ className: 'mock-golden-retriever', probability: 0.92 }];
      }
    };
  }
};
`;

export async function mockCDN(page: Page): Promise<void> {
  await page.route('**/cdn.jsdelivr.net/npm/@tensorflow/tfjs**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: TF_STUB }),
  );
  await page.route('**/cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: MOBILENET_STUB }),
  );
}

// --- Listener instrumentation ---
// Wraps addEventListener to count registrations per element/event.
// After page load, read window.__listenerCounts from page.evaluate().

export async function instrumentListeners(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).__listenerCounts = {};
    const original = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (this instanceof HTMLElement && (this as HTMLElement).id) {
        const key = `${(this as HTMLElement).id}:${type}`;
        (window as any).__listenerCounts[key] =
          ((window as any).__listenerCounts[key] || 0) + 1;
      }
      return original.call(this, type, listener, options);
    };
  });
}
