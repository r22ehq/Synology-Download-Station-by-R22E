import { test, expect } from './fixtures/extension';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('opens extension options in a full tab with a readable settings layout', async ({ page, gotoOptions }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoOptions(page);
  await expect(page.getByRole('heading', { name: 'Connection' })).toBeVisible();
  const sidebar = page.locator('[class*="sidebar"]');
  const content = page.locator('[class*="content"]');
  const [sidebarBox, contentBox] = await Promise.all([sidebar.boundingBox(), content.boundingBox()]);
  expect(sidebarBox?.width).toBeGreaterThan(130);
  expect(contentBox?.x).toBeGreaterThan(sidebarBox?.x ?? 0);
  expect(contentBox?.width).toBeGreaterThan(450);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  await page.screenshot({ path: path.join(tmpdir(), 'r22e-options-full-tab-1280.png') });
});
test.describe('Settings and Theming', () => {
  test('lets users pause background updates without disabling visible refresh', async ({ page, gotoPopup }) => {
    await page.setViewportSize({ width: 580, height: 720 });
    await gotoPopup(page);
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    const background = page.getByRole('checkbox');
    await expect(background).toBeChecked();
    await background.locator('..').click();
    await expect.poll(() => page.evaluate(async () => {
      const extension = globalThis as unknown as { chrome: { storage: { local: { get: (key: string) => Promise<{ settings?: { backgroundPollingEnabled?: boolean } }> } } } };
      return (await extension.chrome.storage.local.get('settings')).settings?.backgroundPollingEnabled;
    })).toBe(false);
    await expect(background).not.toBeChecked();
    await expect.poll(() => background.evaluate(input => getComputedStyle(input.nextElementSibling!).backgroundColor)).toBe('rgb(237, 240, 243)');
    await expect(page.getByLabel('Active refresh interval')).toBeVisible();
    await page.screenshot({ path: path.join(tmpdir(), 'r22e-background-updates-off-580.png') });
    await page.reload();
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('checkbox')).not.toBeChecked();
  });
  test('keeps settings controls compact and aligned in the default popup width', async ({ page, gotoPopup }) => {
    await page.setViewportSize({ width: 580, height: 720 });
    await gotoPopup(page);
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Notifications' }).click();
    const sound = page.getByLabel('Completion sound', { exact: true });
    const preview = page.getByRole('button', { name: 'Preview completion sound' });
    const soundBox = await sound.boundingBox();
    const previewBox = await preview.boundingBox();
    expect(soundBox).not.toBeNull();
    expect(previewBox).not.toBeNull();
    expect(Math.abs((soundBox?.height || 0) - (previewBox?.height || 0))).toBeLessThanOrEqual(2);
    expect((previewBox?.x || 0) + (previewBox?.width || 0)).toBeLessThanOrEqual(580);
    await page.screenshot({ path: path.join(tmpdir(), 'r22e-settings-notifications-580.png') });

    await page.getByRole('button', { name: 'Refresh' }).click();
    const interval = page.getByLabel('Active refresh interval');
    const selectBox = await interval.boundingBox();
    const arrowBox = await interval.locator('..').locator('svg').boundingBox();
    expect(selectBox).not.toBeNull();
    expect(arrowBox).not.toBeNull();
    expect(arrowBox!.x).toBeGreaterThan(selectBox!.x + selectBox!.width - 35);
    expect(arrowBox!.x + arrowBox!.width).toBeLessThan(selectBox!.x + selectBox!.width);

    await page.getByRole('button', { name: 'Data' }).click();
    for (const name of ['Export Settings', 'Import Settings']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeLessThanOrEqual(34);
    }
    await page.screenshot({ path: path.join(tmpdir(), 'r22e-settings-data-580.png') });
  });
  test('offers six completion sounds and keeps the selected style', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Notifications' }).click();

    const choice = page.getByLabel('Completion sound', { exact: true });
    await expect(choice.locator('option')).toHaveCount(6);
    await expect(choice).toHaveValue('soft');
    await choice.selectOption('ripple');
    await page.getByRole('button', { name: 'Preview completion sound' }).click();

    await page.reload();
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(page.getByLabel('Completion sound', { exact: true })).toHaveValue('ripple');
  });

  test('keeps independent light and dark appearance palettes', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Appearance' }).click();

    await page.getByRole('tab', { name: 'Light', exact: true }).click();
    await page.getByRole('button', { name: 'Ocean' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect.poll(() => page.locator('html').evaluate(element => element.style.getPropertyValue('--theme-light-accent'))).toBe('#0284c7');

    await page.getByRole('tab', { name: 'Dark', exact: true }).click();
    await expect(page.getByTestId('palette-tab-indicator')).toHaveCount(1);
    await page.getByRole('button', { name: 'Ember' }).click();
    await page.getByLabel('Accent hex value').fill('#33A0FF');
    await page.getByRole('tab', { name: 'Dark', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect.poll(() => page.locator('html').evaluate(element => element.style.getPropertyValue('--theme-dark-accent'))).toBe('#33a0ff');

    await expect(page.getByText('Right-to-left layout')).toHaveCount(0);
  });

  test('controls download and scrape context actions separately', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    await page.getByTitle('Settings').click();
    await page.getByRole('button', { name: 'Browser', exact: true }).click();

    const downloadToggle = page.getByRole('checkbox').nth(0);
    const scrapeToggle = page.getByRole('checkbox').nth(1);

    await expect(downloadToggle).toBeChecked();
    await expect(scrapeToggle).toBeChecked();
    await downloadToggle.locator('..').click();
    await expect(downloadToggle).not.toBeChecked();
    await expect(scrapeToggle).toBeChecked();
  });

  test('keeps settings navigation stable when content starts scrolling', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    await page.setViewportSize({ width: 760, height: 560 });
    await page.getByTitle('Settings').click();

    const connectionNav = page.getByRole('button', { name: 'Connection' });
    const settingsMain = page.locator('main');
    // Measure the settled page, after the user-requested entrance animation.
    await settingsMain.evaluate(async element => {
      await Promise.all(element.getAnimations().map(animation => animation.finished));
    });
    const beforeNav = await connectionNav.boundingBox();
    const beforeMain = await settingsMain.boundingBox();

    await page.getByRole('button', { name: 'Appearance' }).click();
    const afterNav = await connectionNav.boundingBox();
    const afterMain = await settingsMain.boundingBox();

    expect(afterNav).not.toBeNull();
    expect(afterMain).not.toBeNull();
    expect(afterNav?.x).toBe(beforeNav?.x);
    expect(afterNav?.width).toBe(beforeNav?.width);
    expect(afterMain?.x).toBe(beforeMain?.x);
    expect(afterMain?.width).toBe(beforeMain?.width);
    const content = page.getByRole('region', { name: 'Appearance settings' });
    await content.evaluate(element => { element.scrollTop = element.scrollHeight; });
    expect(await content.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    expect((await connectionNav.boundingBox())?.y).toBe(afterNav?.y);
    expect(await settingsMain.evaluate(element => element.scrollTop)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollTop)).toBe(0);
  });

  test('can export settings', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    await page.getByTitle('Settings').click();

    const exportBtn = page.getByRole('button', { name: /Export/i });
    if (await exportBtn.isVisible()) {
      // Mock download
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportBtn.click()
      ]);
      expect(download.suggestedFilename()).toContain('r22e-station');
    }
  });
});
