import { test, expect } from './fixtures/extension';

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
    await page.getByText('Add NAS').click();
    await page.getByLabel(/NAS URL/i).fill(mockNas.getUrl());
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await gotoPopup(page);
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('SidePanel Task')).toBeVisible({ timeout: 10000 });
  });

  test('opens and renders same shared task state as popup', async ({ page, gotoSidePanel }) => {
    await gotoSidePanel(page);
    await expect(page.getByText('SidePanel Task')).toBeVisible({ timeout: 10000 });
  });
});
