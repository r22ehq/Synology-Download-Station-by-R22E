import { test, expect } from './fixtures/extension';

// This suite runs only if R22E_TEST_NAS_URL is provided
test.describe('Real NAS Integration Suite', () => {
  test.skip(!process.env.R22E_TEST_NAS_URL, 'Skipping Real NAS tests because R22E_TEST_NAS_URL is not set.');

  test('authenticates and lists tasks', async ({ page, gotoOptions, gotoPopup }) => {
    // Add real profile
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS Connection' }).click();
    await page.getByLabel(/NAS URL/i).fill(process.env.R22E_TEST_NAS_URL!);
    await page.getByLabel(/Username/i).fill(process.env.R22E_TEST_USERNAME!);
    await page.getByLabel(/Password/i).fill(process.env.R22E_TEST_PASSWORD!);
    await page.getByRole('button', { name: 'Save Profile' }).click();

    // Go to popup and verify connection
    await gotoPopup(page);
    
    // We expect the UI to not show 'Disconnected'
    await expect(page.getByText('Disconnected')).toBeHidden({ timeout: 15000 });
  });
});
