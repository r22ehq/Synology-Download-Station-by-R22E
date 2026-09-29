import { test, expect } from './fixtures/extension';
import { addMockNasAndConnect } from './fixtures/setup-flow';

test.describe('Side Panel', () => {
  test.beforeEach(async ({ page, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'SUCCESS';
    mockNas.state.tasks = [
      {
        id: 'task1',
        title: 'SidePanel Task',
        status: 'downloading',
        size: 100,
        type: 'http',
        username: 'admin',
        additional: {
          transfer: { size_downloaded: 50, size_uploaded: 0, speed_download: 0, speed_upload: 0 },
        },
      },
    ];

    await gotoPopup(page);
    await addMockNasAndConnect(page, mockNas);
    await expect(page.getByText('SidePanel Task')).toBeVisible({ timeout: 10000 });
  });

  test('opens and renders same shared task state as popup', async ({ page, gotoSidePanel }) => {
    await gotoSidePanel(page);
    await expect(page.getByText('SidePanel Task')).toBeVisible({ timeout: 10000 });
  });
});
