import { test, expect } from './fixtures/extension';

test.describe('Destination Browser', () => {
  test.beforeEach(async ({ page, gotoPopup, mockNas }) => {
    await gotoPopup(page);
    await page.getByText('Add NAS').click();
    await page.getByLabel(/NAS URL/i).fill(mockNas.getUrl());
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Save Profile' }).click();
  });

  test('can browse and select a NAS destination', async ({ page, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'SUCCESS';
    await gotoPopup(page);

    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('button', { name: 'Open add download form' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add download' });
    await expect(dialog.getByText('downloads')).toBeVisible();
    await dialog.getByRole('button', { name: 'Select' }).first().click();
    await expect(dialog.getByText('/volume1/downloads')).toBeVisible();
  });
});
