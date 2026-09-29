import { test, expect } from './fixtures/extension';
import { addMockNasAndConnect } from './fixtures/setup-flow';

test.describe('Destination Browser', () => {
  test.beforeEach(async ({ page, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'SUCCESS';
    await gotoPopup(page);
    await addMockNasAndConnect(page, mockNas);
    await expect(page.getByText('Connected', { exact: true })).toBeVisible();
  });

  test('can browse and select a NAS destination', async ({ page, gotoPopup }) => {
    await gotoPopup(page);

    await page.getByRole('button', { name: 'Open add download form' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add download' });
    const destination = dialog.getByRole('button', { name: /^Destination/ });
    await expect(destination).toHaveAttribute('aria-expanded', 'false');
    await destination.click();
    await dialog.getByRole('button', { name: 'Select downloads' }).click();
    await expect(destination).toContainText('/volume1/downloads');
  });
});
