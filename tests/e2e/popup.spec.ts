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

  test('keeps the connection form inside the popup without horizontal overflow', async ({ page, gotoPopup }) => {
    await page.setViewportSize({ width: 580, height: 520 });
    await gotoPopup(page);
    await page.getByRole('button', { name: 'Add NAS' }).click();
    await expect(page.getByRole('button', { name: /Local HTTPS Port 5001/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Local HTTP Port 5000/ })).toBeVisible();
    const shell = page.locator('[class*="surface_popup"]');
    expect(await shell.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.getByRole('button', { name: 'Save and connect' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Save and connect' })).toBeVisible();
  });
});
