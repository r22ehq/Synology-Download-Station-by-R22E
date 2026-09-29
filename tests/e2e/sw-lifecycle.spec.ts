import { test, expect } from './fixtures/extension';
import { addMockNasAndConnect } from './fixtures/setup-flow';

test.describe('Service Worker Lifecycle', () => {
  test('reconstructs state on wakeup without duplicates', async ({ page, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'SUCCESS';
    mockNas.state.tasks = [{ id: 'task1', title: 'Lifecycle Task', status: 'downloading', size: 100, type: 'http', username: 'admin', additional: { transfer: { size_downloaded: 50, size_uploaded: 0, speed_download: 0, speed_upload: 0 } } }];

    await gotoPopup(page);
    await addMockNasAndConnect(page, mockNas);

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
