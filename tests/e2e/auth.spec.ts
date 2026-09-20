import { test, expect } from './fixtures/extension';

test.describe('Authentication flows', () => {
  test('handles successful login and task loading', async ({ page, gotoOptions, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'SUCCESS';
    mockNas.state.tasks = [{ id: 'task1', title: 'Test Download', status: 'downloading', size: 1000, downloaded: 500 }];

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

    await expect(page.getByText('Test Download')).toBeVisible({ timeout: 10000 });
  });

  test('displays OTP UI when required and handles correct OTP', async ({ page, gotoOptions, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'OTP_REQUIRED';
    mockNas.state.tasks = [{ id: 'task2', title: 'OTP Task', status: 'downloading', size: 500, downloaded: 100 }];

    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS Connection' }).click();
    await page.getByLabel(/NAS URL/i).fill(mockNas.getUrl());
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByLabel(/Password/i).fill('password123');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await gotoPopup(page);
    await page.getByLabel(/Password/i).fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();

    // Should show OTP input
    await expect(page.getByLabel(/Verification Code/i)).toBeVisible({ timeout: 10000 });

    // Submit wrong OTP first
    await page.getByLabel(/Verification Code/i).fill('000000');
    await page.getByRole('button', { name: /Submit Code/i }).click();

    // Wait for the button to be re-enabled after failure
    await expect(page.getByRole('button', { name: /Submit Code/i })).toBeEnabled();

    // Submit correct OTP
    await page.getByLabel(/Verification Code/i).fill('123456');
    await page.getByRole('button', { name: /Submit Code/i }).click();

    // After successful OTP, should show tasks
    await expect(page.getByText('OTP Task')).toBeVisible({ timeout: 10000 });
  });

  test('handles invalid credentials', async ({ page, gotoOptions, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'INVALID_CREDENTIALS';

    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS Connection' }).click();
    await page.getByLabel(/NAS URL/i).fill(mockNas.getUrl());
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByLabel(/Password/i).fill('wrongpass');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await gotoPopup(page);
    await page.getByLabel(/Password/i).fill('wrongpass');
    await page.getByRole('button', { name: 'Login' }).click();

    // Should show error message or keep login form visible
    await expect(page.getByLabel(/Password/i)).toBeVisible({ timeout: 5000 });
  });
});
