import { test, expect } from './fixtures/extension';
import { addMockNasAndConnect } from './fixtures/setup-flow';

test.describe('Refresh Coordinator Runtime Test', () => {
  test('Popup and Side Panel trigger exactly ONE NAS request together', async ({
    page,
    context,
    gotoPopup,
    gotoSidePanel,
    mockNas,
  }) => {
    mockNas.state.authStatus = 'SUCCESS';
    mockNas.state.tasks = [
      {
        id: 'task1',
        title: 'Coordinator Task',
        status: 'downloading',
        type: 'http',
        username: 'admin',
        size: 100,
        additional: {
          transfer: { size_downloaded: 50, size_uploaded: 0, speed_download: 0, speed_upload: 0 },
        },
      },
    ];

    await gotoPopup(page);
    await addMockNasAndConnect(page, mockNas);
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
