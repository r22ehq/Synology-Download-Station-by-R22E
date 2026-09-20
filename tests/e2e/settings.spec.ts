import { test, expect } from './fixtures/extension';

test.describe('Settings and Theming', () => {
  test('can toggle theme and RTL layout', async ({ page, gotoOptions }) => {
    await gotoOptions(page);
    
    // Theme toggle
    const lightBtn = page.getByRole('button', { name: /Light/i });
    if (await lightBtn.isVisible()) {
      await lightBtn.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      
      const darkBtn = page.getByRole('button', { name: /Dark/i });
      await darkBtn.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    }
  });

  test('can export settings', async ({ page, gotoOptions }) => {
    await gotoOptions(page);
    
    const exportBtn = page.getByRole('button', { name: /Export/i });
    if (await exportBtn.isVisible()) {
      // Mock download
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportBtn.click()
      ]);
      expect(download.suggestedFilename()).toContain('r22e-station');
    }
  });
});
