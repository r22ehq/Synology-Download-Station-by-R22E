import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MockNasServer } from '../tests/e2e/fixtures/mock-server.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extensionPath = path.join(root, '.output/chrome-mv3');
const mediaPath = path.join(root, 'output/playwright/product-media');
await mkdir(mediaPath, { recursive: true });

const mockNas = new MockNasServer();
await mockNas.start();
mockNas.state.statistics = { speed_download: 12_400_000, speed_upload: 0 };
mockNas.state.tasks = [
  { id: 'active', title: 'Linux-distribution.iso', status: 'downloading', size: 4_800_000_000, type: 'http', username: 'demo', additional: { transfer: { size_downloaded: 3_264_000_000, size_uploaded: 0, speed_download: 12_400_000, speed_upload: 0 } } },
  { id: 'finished', title: 'Sample-video.mp4', status: 'finished', size: 700_000_000, type: 'http', username: 'demo', additional: { transfer: { size_downloaded: 700_000_000, size_uploaded: 0, speed_download: 0, speed_upload: 0 } } },
  { id: 'paused', title: 'Example-archive.zip', status: 'paused', size: 320_000_000, type: 'http', username: 'demo', additional: { transfer: { size_downloaded: 120_000_000, size_uploaded: 0, speed_download: 0, speed_upload: 0 } } },
];

const context = await chromium.launchPersistentContext('', {
  headless: false,
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});

try {
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;
  const page = await context.newPage();
  const screenshot = async (name) => {
    const viewport = page.viewportSize();
    if (viewport) await page.mouse.move(viewport.width - 2, viewport.height - 2);
    await page.waitForTimeout(350);
    const idleRefresh = page.locator('header button[aria-label="Refresh tasks"]');
    if (await page.locator('header button[aria-label="Refresh tasks"], header button[aria-label="Refreshing tasks"], header button[aria-label="Tasks refreshed"]').count()) {
      await idleRefresh.waitFor({ state: 'visible', timeout: 10_000 });
    }
    await page.evaluate(() => {
      const host = document.querySelector('header [class*="subtitleRow"] > span');
      if (host) host.textContent = 'Demo NAS';
    });
    await page.screenshot({
      path: path.join(mediaPath, name),
      type: 'jpeg',
      quality: 92,
      animations: 'disabled',
      caret: 'hide',
    });
  };

  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.getByText('Add NAS').click();
  await page.getByLabel(/NAS URL/i).fill(mockNas.getUrl());
  await page.getByLabel(/Username/i).fill('demo');
  await page.getByPlaceholder('Password').fill('demo-only');
  await page.getByRole('button', { name: 'Save Profile' }).click();
  await page.getByText('Login Required').waitFor({ timeout: 30_000 }).catch(async error => {
    await page.screenshot({ path: path.join(mediaPath, 'capture-error.jpg'), type: 'jpeg' });
    console.warn((await page.locator('body').innerText()).slice(0, 800));
    throw error;
  });
  await page.getByPlaceholder('Password').fill('demo-only');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByText('Linux-distribution.iso').waitFor({ timeout: 10_000 });

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await page.getByText('Linux-distribution.iso').waitFor({ timeout: 10_000 });
  await page.getByText('Example-archive.zip').waitFor({ timeout: 10_000 });
  await page.setViewportSize({ width: 640, height: 400 });
  await screenshot('tasks-light-1280x800.jpg');
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await page.getByRole('button', { name: 'Appearance' }).click();
  await page.getByRole('tab', { name: 'Dark', exact: true }).click();
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 1280, height: 800 });
  await screenshot('appearance-dark-2560x1600.jpg');
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByText('Linux-distribution.iso').waitFor({ timeout: 10_000 });
  await page.setViewportSize({ width: 640, height: 400 });
  await screenshot('tasks-dark-1280x800.jpg');

  await page.setViewportSize({ width: 440, height: 760 });
  await screenshot('tasks-compact-880x1520.jpg');
  await page.setViewportSize({ width: 640, height: 400 });
  let frame = 0;
  const frameShot = async () => {
    const name = `frame-${String(frame++).padStart(2, '0')}.jpg`;
    await screenshot(name);
  };
  for (let i = 0; i < 3; i++) await frameShot();
  await page.getByRole('tab', { name: /Downloading,/ }).click();
  for (let i = 0; i < 2; i++) await frameShot();
  await page.getByRole('tab', { name: /Completed,/ }).click();
  for (let i = 0; i < 2; i++) await frameShot();
  await page.getByRole('tab', { name: /Inactive,/ }).click();
  for (let i = 0; i < 2; i++) await frameShot();
  await page.getByRole('tab', { name: /All,/ }).click();
  await page.getByText('Linux-distribution.iso').click();
  for (let i = 0; i < 3; i++) await frameShot();
  console.warn(`Captured ${frame} demo frames and four screenshots in ${mediaPath}`);
} finally {
  await context.close();
  await mockNas.stop();
}
