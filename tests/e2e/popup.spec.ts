import { test, expect } from './fixtures/extension';

test.describe('Popup UI', () => {
  test('opens empty state if no profile is configured', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    
    // Expect the empty state text to be visible
    await expect(page.getByText('No NAS Configured')).toBeVisible();
    await expect(page.getByText('Please open the settings to connect your Synology NAS.')).toBeVisible();
    
    // Expect the button to open settings
    await expect(page.getByRole('button', { name: /Open Settings/i })).toBeVisible();
  });
});