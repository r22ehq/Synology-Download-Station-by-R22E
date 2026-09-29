import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import { MockNasServer } from './mock-server';

// Chromium may briefly block extension pages while chrome.runtime.reload()
// re-registers the MV3 extension. Retry only that transient navigation error.
async function navigateToExtensionPage(page: Page, url: string) {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await page.goto(url);
      return;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('ERR_BLOCKED_BY_CLIENT') || attempt === 7) throw error;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
}

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  mockNas: MockNasServer;
  gotoPopup: (page: Page) => Promise<void>;
  gotoOptions: (page: Page) => Promise<void>;
  gotoSidePanel: (page: Page) => Promise<void>;
  gotoPrompt: (page: Page) => Promise<void>;
}>({
  // eslint-disable-next-line no-empty-pattern
  mockNas: [async ({}, use) => {
    const server = new MockNasServer();
    await server.start();
    await use(server);
    await server.stop();
  }, { scope: 'test' }],

  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const buildTarget = process.env.R22E_BROWSER_CHANNEL === 'msedge' ? 'edge' : 'chrome';
    const pathToExtension = path.resolve(__dirname, `../../../.output/${buildTarget}-mv3`);
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      channel: process.env.R22E_BROWSER_CHANNEL as 'chrome' | 'msedge' | undefined,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    // Runtime Error Collection
    const errors: string[] = [];
    context.on('page', (page) => {
      page.on('pageerror', (exception) => {
        errors.push(`PageError: ${exception.message}`);
      });
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(`ConsoleError: ${msg.text()}`);
        }
      });
    });

    await use(context);

    // Fail if there were unexpected runtime errors collected
    if (errors.length > 0) {
      throw new Error(`Runtime errors detected during test: \n${errors.join('\n')}`);
    }

    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // For MV3, we wait for the background service worker
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2] || '';
    await use(extensionId);
  },
  gotoPopup: async ({ extensionId }, use) => {
    await use(async (page: Page) => {
      await navigateToExtensionPage(page, `chrome-extension://${extensionId}/popup.html`);
    });
  },
  gotoOptions: async ({ extensionId }, use) => {
    await use(async (page: Page) => {
      await navigateToExtensionPage(page, `chrome-extension://${extensionId}/options.html`);
    });
  },
  gotoSidePanel: async ({ extensionId }, use) => {
    await use(async (page: Page) => {
      await navigateToExtensionPage(page, `chrome-extension://${extensionId}/sidepanel.html`);
    });
  },
  gotoPrompt: async ({ extensionId }, use) => {
    await use(async (page: Page) => {
      await navigateToExtensionPage(page, `chrome-extension://${extensionId}/prompt.html`);
    });
  },
});

export const expect = test.expect;
