import { test, expect } from './fixtures/extension';

test.describe('Private Tracker Integration', () => {
  test('handles exact-origin permission flow for private trackers', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    const promptUrl = page.url().replace('popup.html', 'prompt.html?url=https://private-tracker.com/file.torrent&origin=https://private-tracker.com/*');
    await page.goto(promptUrl);
    
    await expect(page.getByText(/private-tracker.com/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Grant Access/i })).toBeVisible();
  });
});
