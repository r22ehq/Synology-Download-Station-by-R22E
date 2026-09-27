import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from './fixtures/extension';

const auditDir = path.resolve('output/playwright/ui-audit');

test.describe('Current UI visual audit', () => {
  test('reviews the primary extension surfaces and states', async ({ page, gotoPopup, gotoSidePanel, gotoOptions, mockNas }) => {
    await mkdir(auditDir, { recursive: true });
    mockNas.state.authStatus = 'SUCCESS';
    mockNas.state.statistics = { speed_download: 12_400_000, speed_upload: 1_200_000 };
    mockNas.state.tasks = [
      {
        id: 'ubuntu', title: 'Ubuntu 24.04 LTS.iso', status: 'downloading', size: 4_800_000_000, type: 'http', username: 'admin',
        additional: {
          detail: { uri: 'https://example.com/ubuntu.iso', destination: '/volume1/downloads', create_time: 1, started_time: 2, completed_time: 0, priority: 'normal' },
          transfer: { size_downloaded: 3_264_000_000, size_uploaded: 0, speed_download: 12_400_000, speed_upload: 0 },
          file: [{ filename: 'Ubuntu 24.04 LTS.iso', size: 4_800_000_000, size_downloaded: 3_264_000_000, priority: 'normal', wanted: true }],
        },
      },
      { id: 'movie', title: 'movie-trailer.mp4', status: 'downloading', size: 2_800_000_000, type: 'http', username: 'admin', additional: { transfer: { size_downloaded: 1_176_000_000, size_uploaded: 0, speed_download: 8_100_000, speed_upload: 0 } } },
      { id: 'archive', title: 'archive.rar', status: 'finished', size: 700_000_000, type: 'http', username: 'admin', additional: { transfer: { size_downloaded: 700_000_000, size_uploaded: 0, speed_download: 0, speed_upload: 0 } } },
      { id: 'torrent', title: 'sample.torrent', status: 'paused', size: 450_000_000, type: 'bt', username: 'admin', additional: { transfer: { size_downloaded: 0, size_uploaded: 0, speed_download: 0, speed_upload: 0 } } },
      { id: 'bunny', title: 'Big.Buck.Bunny.mkv', status: 'finished', size: 893_000_000, type: 'http', username: 'admin', additional: { transfer: { size_downloaded: 893_000_000, size_uploaded: 0, speed_download: 0, speed_upload: 0 } } },
      { id: 'queued', title: 'file.zip', status: 'waiting', size: 320_000_000, type: 'http', username: 'admin', additional: { transfer: { size_downloaded: 0, size_uploaded: 0, speed_download: 0, speed_upload: 0 } } },
    ];

    await page.setViewportSize({ width: 720, height: 760 });
    await gotoPopup(page);
    await page.getByText('Add NAS').click();
    await page.getByLabel(/NAS URL/i).fill(mockNas.getUrl());
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Save Profile' }).click();
    await expect(page.getByText('Login Required')).toBeVisible({ timeout: 10_000 });
    await page.setViewportSize({ width: 580, height: 720 });
    await page.screenshot({ path: path.join(auditDir, '00-login-required.png'), fullPage: true });
    await gotoPopup(page);
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('Ubuntu 24.04 LTS.iso')).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: path.join(auditDir, '01-popup-light.png'), fullPage: true });

    await page.getByRole('button', { name: 'Ubuntu 24.04 LTS.iso', exact: true }).click();
    await expect(page.getByText('Download speed')).toBeVisible();
    await page.screenshot({ path: path.join(auditDir, '02-task-details.png'), fullPage: true });

    await expect(page.getByRole('button', { name: 'Add task' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Open add download form' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: path.join(auditDir, '03-add-download.png'), fullPage: true });
    await page.getByRole('button', { name: 'Close' }).click();

    await page.setViewportSize({ width: 960, height: 820 });
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Appearance' }).click();
    await page.getByRole('tab', { name: 'Light', exact: true }).click();
    await page.getByRole('button', { name: 'Ocean' }).click();
    await page.screenshot({ path: path.join(auditDir, '04-appearance-light.png'), fullPage: true });

    await page.getByRole('tab', { name: 'Dark', exact: true }).click();
    await page.getByRole('button', { name: 'Midnight' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.screenshot({ path: path.join(auditDir, '05-appearance-dark.png'), fullPage: true });

    await page.getByRole('button', { name: 'Browser', exact: true }).click();
    await page.screenshot({ path: path.join(auditDir, '06-browser-integration.png'), fullPage: true });
    await page.getByRole('button', { name: 'Notifications' }).click();
    await page.screenshot({ path: path.join(auditDir, '06b-notifications.png'), fullPage: true });
    await page.getByRole('button', { name: 'Data' }).click();
    await page.screenshot({ path: path.join(auditDir, '07-data-backup.png'), fullPage: true });
    await page.getByRole('button', { name: 'About' }).click();
    await expect(page.getByText('About R22E Station')).toBeVisible();
    await page.screenshot({ path: path.join(auditDir, '07b-about.png'), fullPage: true });

    await page.setViewportSize({ width: 430, height: 760 });
    await gotoSidePanel(page);
    await expect(page.getByText('Ubuntu 24.04 LTS.iso')).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: path.join(auditDir, '08-sidepanel-dark.png'), fullPage: true });

    await page.setViewportSize({ width: 580, height: 720 });
    await gotoPopup(page);
    await page.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('button', { name: 'Open Download Station' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'About', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(auditDir, '08b-actions-menu.png'), fullPage: true });
    await page.getByRole('button', { name: 'About', exact: true }).click();
    await expect(page.getByText('About R22E Station')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page.getByText('Login Required')).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: path.join(auditDir, '09-login-required-dark.png'), fullPage: true });
  });
});
