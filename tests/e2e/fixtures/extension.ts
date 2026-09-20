import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import { MockNasServer } from './mock-server';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  mockNas: MockNasServer;
  gotoPopup: (page: Page) => Promise<void>;
  gotoOptions: (page: Page) => Promise<void>;
  gotoSidePanel: (page: Page) => Promise<void>;
  gotoPrompt: (page: Page) => Promise<void>;
}>({
  mockNas: [async ({}, use) => {
    const server = new MockNasServer();
    await server.start();
    await use(server);
    await server.stop();
  }, { scope: 'test' }],

  context: async ({}, use) => {
    const pathToExtension = path.resolve(__dirname, '../../../.output/chrome-mv3');
    const context = await chromium.launchPersistentContext('', {
      headless: false,
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
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
    });
  },
  gotoOptions: async ({ extensionId }, use) => {
    await use(async (page: Page) => {
      await page.goto(`chrome-extension://${extensionId}/options.html`);
    });
  },
  gotoSidePanel: async ({ extensionId }, use) => {
    await use(async (page: Page) => {
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    });
  },
  gotoPrompt: async ({ extensionId }, use) => {
    await use(async (page: Page) => {
      await page.goto(`chrome-extension://${extensionId}/prompt.html`);
    });
  },
});

export const expect = test.expect;
