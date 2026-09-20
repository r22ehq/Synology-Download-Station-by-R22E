import { test, expect } from './fixtures/extension';

test.describe('Refresh Coordinator Runtime Test', () => {
  test('Popup and Side Panel trigger exactly ONE NAS request together', async ({ page, context, gotoOptions, gotoPopup, gotoSidePanel, mockNas, extensionId }) => {
    mockNas.state.authStatus = 'SUCCESS';
    mockNas.state.tasks = [{ id: 'task1', title: 'Coordinator Task', status: 'downloading', size: 100, downloaded: 50 }];

    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS Connection' }).click();
    await page.getByLabel(/NAS URL/i).fill(mockNas.getUrl());
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByLabel(/Password/i).fill('password123');
    await page.getByRole('button', { name: 'Save Profile' }).click();
    await expect(page.getByText(mockNas.getUrl())).toBeVisible();

    await gotoPopup(page);
    await page.getByLabel(/Password/i).fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('Coordinator Task')).toBeVisible({ timeout: 10000 });

    // Reset request counts after initial login/setup requests
    mockNas.requestCounts = {};

    // Open side panel page — should share cached tasks, not trigger a new fetch
    const sidePanelPage = await context.newPage();
    await gotoSidePanel(sidePanelPage);
    await expect(sidePanelPage.getByText('Coordinator Task')).toBeVisible({ timeout: 10000 });

    // Wait for any in-flight requests to settle
    await page.waitForTimeout(1500);

    // The coordinator should coalesce requests. At most 1 task.cgi request.
    const taskRequests = mockNas.requestCounts['/webapi/DownloadStation/task.cgi'] || 0;
    expect(taskRequests).toBeLessThanOrEqual(1);
  });
});
