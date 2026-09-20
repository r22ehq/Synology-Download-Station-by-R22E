import { test, expect } from './fixtures/extension';

test.describe('Task Creation', () => {
  test.beforeEach(async ({ page, gotoOptions, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'SUCCESS';
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
    await expect(page.getByText('Disconnected')).toBeHidden();
  });

  test('creates task from URL', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    await page.getByPlaceholder(/Paste URL/i).fill('http://example.com/file.zip');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByPlaceholder(/Paste URL/i)).toBeVisible();
  });

  test('creates task from magnet', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    await page.getByPlaceholder(/Paste URL/i).fill('magnet:?xt=urn:btih:12345');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByPlaceholder(/Paste URL/i)).toBeVisible();
  });
});
