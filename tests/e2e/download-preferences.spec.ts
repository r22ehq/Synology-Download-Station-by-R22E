import { test, expect } from './fixtures/extension';
import { tmpdir } from 'node:os';
import path from 'node:path';

test.describe('Download preferences and file upload', () => {
  test.beforeEach(async ({ page, gotoPopup, mockNas }) => {
    await page.setViewportSize({ width: 580, height: 520 });
    await gotoPopup(page);
    await page.getByRole('button', { name: 'Add NAS' }).click();
    const http = page.getByRole('button', { name: /Local HTTP Port 5000/ });
    const https = page.getByRole('button', { name: /Local HTTPS Port 5001/ });
    expect((await http.boundingBox())!.x).toBeLessThan((await https.boundingBox())!.x);
    await http.click();
    await page.getByLabel('NAS address', { exact: true }).fill(mockNas.getUrl());
    await expect(page.getByLabel('Username', { exact: true })).toBeEnabled();
    await page.getByLabel('Username', { exact: true }).fill('admin');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Save and connect' }).click();
    await expect(page.getByText('Connected', { exact: true })).toBeVisible();
  });

  test('starts with a collapsed destination and browses without overflow', async ({ page, mockNas }) => {
    await page.getByRole('button', { name: 'Open add download form' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add download' });
    const destination = dialog.getByRole('button', { name: /^Destination/ });
    await expect(destination).toHaveAttribute('aria-expanded', 'false');
    expect(mockNas.requestCounts['SYNO.FileStation.List'] || 0).toBe(0);
    await page.screenshot({ path: path.join(tmpdir(), 'r22e-015-add-collapsed.png') });
    await destination.click();
    await expect(destination).toHaveAttribute('aria-expanded', 'true');
    await dialog.getByRole('button', { name: 'Open downloads' }).click();
    await expect(dialog.getByText('No subfolders. You can select this folder.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Use this folder' }).click();
    await expect(destination).toContainText('/volume1/downloads');
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await dialog.getByRole('button', { name: 'Use NAS default' }).click();
    await expect(destination).toContainText('NAS default');
    await destination.click();
    await expect(destination).toHaveAttribute('aria-expanded', 'false');
  });

  test('saves a per-profile location and can return to the NAS default', async ({ page, mockNas }) => {
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Location', exact: true }).click();
    await expect(page.getByText('/volume1/downloads', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Select downloads' }).click();
    await page.getByRole('button', { name: 'Save location' }).click();
    await expect(page.getByRole('status')).toContainText('Location saved');
    expect(mockNas.state.config.default_destination).toBe('/volume1/downloads');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Open add download form' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add download' });
    await expect(dialog.getByRole('button', { name: /Destination/ })).toContainText('/volume1/downloads');
    await dialog.getByRole('button', { name: /Destination/ }).click();
    await dialog.getByRole('button', { name: 'Use NAS default' }).click();
    await dialog.getByRole('textbox').first().fill('https://example.com/default.zip');
    await dialog.getByRole('button', { name: 'Add download', exact: true }).click();
    await expect.poll(() => mockNas.state.tasks.length).toBe(1);
    expect(mockNas.state.tasks[0]?.additional?.detail?.destination).toBe('');
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Location', exact: true }).click();
    await page.getByRole('checkbox', { name: /Use Download Station default/ }).check();
    await page.getByRole('button', { name: 'Save location' }).click();
    await expect(page.getByRole('status')).toContainText('Location saved');
    await page.screenshot({ path: path.join(tmpdir(), 'r22e-015-location.png') });
  });

  test('updates NAS speed limits without changing unrelated settings', async ({ page, mockNas }) => {
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Speed', exact: true }).click();
    await expect(page.getByLabel('BitTorrent upload (KB/s)')).toHaveValue('20');
    await page.getByLabel('BitTorrent upload (KB/s)').fill('50');
    await page.getByLabel('HTTP / FTP download (KB/s)').fill('200');
    await page.getByRole('button', { name: 'Save speed limits' }).click();
    await expect(page.getByRole('status')).toContainText('Speed limits saved');
    expect(mockNas.state.config.bt_max_upload).toBe(50);
    expect(mockNas.state.config.http_max_download).toBe(200);
    expect(mockNas.state.config.default_destination).toBe('/volume1/downloads');
    expect(mockNas.state.config.emule_enabled).toBe(false);
    await page.screenshot({ path: path.join(tmpdir(), 'r22e-015-speed.png') });
  });

  test('keeps the Settings frame stable while switching between Location and Speed', async ({ page }) => {
    await page.getByTitle('Settings').click();
    const shell = page.locator('[class*="surface_popup"]');
    const settings = page.locator('[class*="settingsLayout"]');
    const initialShell = await shell.boundingBox();
    const initialSettings = await settings.boundingBox();

    await page.getByRole('button', { name: 'Location', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Select downloads' })).toBeVisible();
    const locationSettings = await settings.boundingBox();
    await page.getByRole('button', { name: 'Speed', exact: true }).click();
    await expect(page.getByLabel('BitTorrent upload (KB/s)')).toBeVisible();
    const speedSettings = await settings.boundingBox();

    expect(await shell.boundingBox()).toEqual(initialShell);
    expect(locationSettings).toEqual(initialSettings);
    expect(speedSettings).toEqual(initialSettings);
  });

  test('does not allow a non-manager to edit speed limits', async ({ page, mockNas }) => {
    mockNas.state.isManager = false;
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Speed', exact: true }).click();
    await expect(page.getByLabel('BitTorrent upload (KB/s)')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save speed limits' })).toBeDisabled();
  });

  test('loads Speed and Location after the background worker restarts', async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    const updated = new Promise<{ versions: Array<{ versionId: string; scriptURL: string }> }>(resolve => {
      cdp.once('ServiceWorker.workerVersionUpdated', resolve);
    });
    await cdp.send('ServiceWorker.enable');
    const { versions } = await updated;
    const worker = versions.find(version => version.scriptURL.startsWith('chrome-extension://'));
    expect(worker).toBeDefined();
    await cdp.send('ServiceWorker.stopWorker', { versionId: worker!.versionId });
    await cdp.detach();
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Speed', exact: true }).click();
    await expect(page.getByLabel('BitTorrent upload (KB/s)')).toHaveValue('20');
    await page.getByRole('button', { name: 'Location', exact: true }).click();
    await expect(page.getByText('/volume1/downloads', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select downloads' })).toBeVisible();
    await expect(page.getByText(/message port closed|background did not respond/)).toHaveCount(0);
  });

  test('uploads task files with unchanged bytes, destination and SID', async ({ page, mockNas }) => {
    for (const name of ['sample.torrent', 'sample.nzb']) {
      const bytes = Buffer.from(name.endsWith('.torrent') ? 'd4:infod6:lengthi0e4:name4:testee' : '<?xml version="1.0"?><nzb></nzb>');
      await page.getByRole('button', { name: 'Open add download form' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add download' });
      await dialog.getByRole('button', { name: 'Task file', exact: true }).click();
      await dialog.locator('input[type=file]').setInputFiles({ name, mimeType: 'application/octet-stream', buffer: bytes });
      await dialog.getByRole('button', { name: /Destination/ }).click();
      await dialog.getByRole('button', { name: 'Select downloads' }).click();
      await dialog.getByRole('button', { name: 'Add download', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      const upload = mockNas.uploads.at(-1)!;
      expect(upload.name).toBe(name); expect(upload.bytes).toEqual(bytes);
      expect(upload.sid).toBe('mock-sid-123'); expect(upload.destination).toBe('/volume1/downloads');
    }
    expect(mockNas.uploads).toHaveLength(2);
  });
});
