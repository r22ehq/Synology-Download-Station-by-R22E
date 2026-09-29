import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, expect } from './fixtures/extension';

test('draws setup selection controls consistently without changing popup size', async ({ page, gotoPopup }) => {
  await page.setViewportSize({ width: 580, height: 520 });
  await gotoPopup(page);
  await expect(page).toHaveTitle('R22E Station');
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await page.getByText('Add NAS').click();

  const remember = page.getByRole('checkbox', { name: /Remember this device/ });
  const local = page.getByRole('radio', { name: /^Local Recommended/ });
  await remember.check();
  await expect(remember).toBeChecked();
  await expect(local).toBeChecked();
  for (const theme of ['light', 'dark'] as const) {
    // Theme is normally controlled by Appearance; set it here to isolate the
    // control rendering while the unfinished setup form remains open.
    await page.locator('html').evaluate((element, value) => element.setAttribute('data-theme', value), theme);
    const control = await remember.evaluate(element => {
      const style = getComputedStyle(element);
      return {
        appearance: style.appearance,
        background: style.backgroundColor,
        image: style.backgroundImage,
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      };
    });
    expect(control.appearance).toBe('none');
    expect(control.image).toContain('data:image/svg+xml');
    expect(control.width).toBe(16);
    expect(control.height).toBe(16);
    expect(control.background).not.toBe('rgb(255, 255, 255)');
    expect(await local.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('radial-gradient');
  }
  await remember.focus();
  await page.keyboard.press('Space');
  await expect(remember).not.toBeChecked();
  expect(await remember.evaluate(element => getComputedStyle(element).backgroundImage)).toBe('none');
  await page.keyboard.press('Space');
  await expect(remember).toBeChecked();
  expect(await remember.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
  const popup = page.locator('[class*="surface_popup"]');
  expect(await popup.evaluate(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }))).toEqual({ width: 580, height: 520 });
  await page.screenshot({ path: path.join(tmpdir(), 'r22e-setup-controls-dark-580.png') });
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await remember.evaluate(element => getComputedStyle(element).appearance)).toBe('auto');
});

test('keeps transfer columns readable and Appearance aligned with app mode', async ({ page, gotoPopup, mockNas }) => {
  mockNas.state.statistics = { speed_download: 23_200_000, speed_upload: 700_000 };
  mockNas.state.tasks = [{
    id: 'layout-task', title: 'MobLand.S01E07.1080p.mkv', status: 'downloading',
    size: 1_000_000_000, type: 'http', username: 'admin',
    additional: { transfer: { size_downloaded: 930_000_000, size_uploaded: 0, speed_download: 23_200_000, speed_upload: 700_000 } },
  }];

  await page.setViewportSize({ width: 580, height: 640 });
  await gotoPopup(page);
  await expect(page).toHaveURL(/\/popup\.html$/);
  await expect(page).toHaveTitle('R22E Station');
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  // Edge sizes an action popup from its document; the shell cannot depend on
  // the viewport height or the popup can shrink to only its header.
  await page.setViewportSize({ width: 580, height: 100 });
  expect(await page.locator('[class*="surface_popup"]').evaluate(element => element.getBoundingClientRect().height)).toBe(520);
  await page.setViewportSize({ width: 580, height: 640 });
  await page.getByText('Add NAS').click();
  await page.getByRole('button', { name: /Local HTTP Port 5000/ }).click();
  await page.getByLabel(/^NAS address$/i).fill(mockNas.getUrl());
  await expect(page.getByLabel('Username', { exact: true })).toBeEnabled();
  await page.getByLabel(/Username/i).fill('admin');
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Save and connect' }).click();
  await expect(page.getByText('Connected', { exact: true })).toBeVisible();
  const filterTabs = page.getByRole('tablist', { name: 'Task filters' }).getByRole('tab');
  await expect(filterTabs).toHaveCount(5);
  const filterBoxes = await filterTabs.evaluateAll(tabs => tabs.map(tab => tab.getBoundingClientRect().toJSON()));
  expect(new Set(filterBoxes.map(box => Math.round(box.y))).size).toBe(1);
  expect(filterBoxes[4]!.right).toBeLessThanOrEqual(580);
  await expect(page.getByText('Speed', { exact: true })).toBeVisible();
  await expect(page.getByText('Status', { exact: true })).toBeVisible();
  const row = page.getByRole('button', { name: 'MobLand.S01E07.1080p.mkv', exact: true }).locator('..');
  await expect(row).toBeVisible();

  const progress = row.locator('[class*="progressCell"]');
  const speed = row.locator('[class*="speedCell"]');
  const status = row.locator('[class*="status"]');
  const [progressBox, speedBox, statusBox] = await Promise.all([progress.boundingBox(), speed.boundingBox(), status.boundingBox()]);
  expect(progressBox).not.toBeNull();
  expect(speedBox).not.toBeNull();
  expect(statusBox).not.toBeNull();
  expect(speedBox!.x - progressBox!.x - progressBox!.width).toBeLessThanOrEqual(12);
  expect(statusBox!.x - speedBox!.x - speedBox!.width).toBeLessThanOrEqual(12);
  expect(await status.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(speed.locator('svg.lucide-arrow-up')).toHaveCount(1);
  await expect(page.getByLabel('Current transfer speed').locator('svg.lucide-arrow-up')).toHaveCount(1);
  await page.screenshot({ path: path.join(tmpdir(), 'r22e-transfer-layout-580.png') });

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Appearance' }).click();
  await page.getByRole('tab', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('tab', { name: 'Dark', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Light', exact: true }).click();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByRole('button', { name: 'Appearance' }).click();
  await expect(page.getByRole('tab', { name: 'Light', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Dark', exact: true })).toHaveAttribute('aria-selected', 'false');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('tab', { name: 'Dark', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Dark', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(async () => {
    const indicator = await page.getByTestId('palette-tab-indicator').boundingBox();
    const tab = await page.getByRole('tab', { name: 'Dark', exact: true }).boundingBox();
    return Math.abs((indicator?.x ?? 0) - (tab?.x ?? 0));
  }).toBeLessThan(1);
  await expect(page.getByText('Toolbar badge')).toBeVisible();
  await page.screenshot({ path: path.join(tmpdir(), 'r22e-appearance-dark-matched-palette-580.png') });
  const badgeSection = page.locator('[class*="badgeSection"]');
  expect(await badgeSection.evaluate(element => parseFloat(getComputedStyle(element).borderTopWidth))).toBeGreaterThan(0);
  await badgeSection.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(tmpdir(), 'r22e-appearance-badge-divider-580.png') });
  await page.getByRole('tab', { name: 'Light', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Light', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('tab', { name: 'Dark', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Dark', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.getByRole('tab', { name: 'System', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'System', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Following your browser · editing dark colors')).toBeVisible();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.getByText('Following your browser · editing light colors')).toBeVisible();
  await page.getByRole('tab', { name: 'Dark', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Dark', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(row).toBeVisible();
  expect(await status.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: path.join(tmpdir(), 'r22e-transfer-layout-dark-580.png') });
});
