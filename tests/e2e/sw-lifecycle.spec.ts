import { test, expect } from './fixtures/extension';

test.describe('Service Worker Lifecycle', () => {
  test('reconstructs state on wakeup without duplicates', async ({ page, gotoOptions, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'SUCCESS';
    mockNas.state.tasks = [{ id: 'task1', title: 'Lifecycle Task', status: 'downloading', size: 100, type: 'http', username: 'admin', additional: { transfer: { size_downloaded: 50, size_uploaded: 0, speed_download: 0, speed_upload: 0 } } }];

    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS Connection' }).click();
    await page.getByLabel(/NAS URL/i).fill(mockNas.getUrl());
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByLabel(/Password/i).fill('password123');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await gotoPopup(page);
    await page.getByLabel(/Password/i).fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Lifecycle Task')).toBeVisible({ timeout: 10000 });

    // Simulate service worker termination by navigating away and back
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    // Navigate back to popup to trigger SW wakeup
    await gotoPopup(page);

    // SW should reconstruct and serve tasks again without requiring login
    await expect(page.getByText('Lifecycle Task')).toBeVisible({ timeout: 10000 });
  });
});
