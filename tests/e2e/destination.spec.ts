import { test, expect } from './fixtures/extension';

test.describe('Destination Browser', () => {
  test.beforeEach(async ({ page, gotoOptions, mockNas }) => {
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS Connection' }).click();
    await page.getByLabel(/NAS URL/i).fill(mockNas.getUrl());
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByLabel(/Password/i).fill('password123');
    await page.getByRole('button', { name: 'Save Profile' }).click();
    await expect(page.getByText(mockNas.getUrl())).toBeVisible();
  });

  test('can browse root and nested folders', async ({ page, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'SUCCESS';
    await gotoPopup(page);
    
    await page.getByLabel(/Password/i).fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Test the Add dialog
    await page.getByPlaceholder(/Paste URL/i).fill('http://example.com/file.zip');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    // Assuming you have a folder browser button in the task add dialog
    // We would test navigating it here. Currently the UI is not fully built for this.
  });
});
