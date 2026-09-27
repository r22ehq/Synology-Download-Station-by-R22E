import { test, expect } from './fixtures/extension';

test.describe('Popup UI', () => {
  test('opens empty state if no profile is configured', async ({ page, gotoPopup }) => {
    await gotoPopup(page);

    // Expect the empty state text to be visible
    await expect(page.getByText('No NAS Configured')).toBeVisible();

    // Expect the button to open settings
    await expect(page.getByText('Add NAS')).toBeVisible();
  });

  test('keeps its intended width when Edge starts from a narrow popup viewport', async ({ page, gotoPopup }) => {
    await page.setViewportSize({ width: 253, height: 650 });
    await gotoPopup(page);

    const shell = page.locator('#app > div').first();
    await expect(shell).toBeVisible();
    await expect.poll(async () => Math.round((await shell.boundingBox())?.width || 0)).toBe(580);
  });
});
