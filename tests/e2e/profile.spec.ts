import { test, expect } from './fixtures/extension';
import { tmpdir } from 'node:os';
import path from 'node:path';

test.describe('Profile Configuration', () => {
  test('can discover and test a real direct QuickConnect endpoint without logging in', async ({ page, gotoPopup }) => {
    const id = process.env.R22E_QC_ID;
    test.skip(!id, 'Set R22E_QC_ID to run this read-only NAS check.');
    await gotoPopup(page);
    await page.getByText('Add NAS').click();
    await page.getByRole('radio', { name: /^QuickConnect Unofficial/ }).check();
    await page.getByRole('textbox', { name: 'QuickConnect ID' }).fill(id!);
    await page.getByRole('textbox', { name: 'Username' }).fill('connection-check');
    await page.getByRole('button', { name: 'Test connection' }).click();
    await expect(page.getByRole('status')).toContainText('Connection successful. Auth skipped.', { timeout: 20000 });
  });

  test('shows local as recommended and clearly warns about experimental QuickConnect', async ({ page, gotoPopup }) => {
    await gotoPopup(page);
    await page.getByText('Add NAS').click();
    await expect(page.getByRole('radio', { name: /^Local Recommended/ })).toBeChecked();
    await expect(page.getByText('Recommended')).toBeVisible();
    await page.getByRole('radio', { name: /^QuickConnect Unofficial/ }).check();
    await expect(page.getByRole('textbox', { name: 'QuickConnect ID' })).toBeVisible();
    await expect(page.getByText('Unofficial · may break')).toBeVisible();
    await expect(page.getByText(/Direct connections only; relay is not supported/)).toBeVisible();
    await expect(page.getByLabel(/NAS URL or address/)).toHaveCount(0);
    await page.setViewportSize({ width: 580, height: 720 });
    await page.screenshot({ path: path.join(tmpdir(), 'r22e-quickconnect-setup-580.png') });
  });

  test('allows adding and deleting a NAS profile via popup', async ({
    page,
    gotoPopup,
    mockNas,
  }) => {
    await gotoPopup(page);

    // In empty state, click Add NAS
    await page.getByText('Add NAS').click();

    // Fill form
    await page.getByLabel(/NAS URL/i).fill(mockNas.getUrl());
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    // Wait for the popup to show Login Required
    await expect(page.getByText('Login Required')).toBeVisible();

    // Now go to settings to verify it's there
    // The settings gear is in the header, maybe there's no text "Settings", just the gear icon?
    // Let's click the Settings button by title
    await page.getByTitle('Settings').click();

    // Expect the profile to be in the list
    await expect(page.getByText('admin')).toBeVisible();

    // Delete
    await page
      .getByRole('button', { name: /Remove/i })
      .first()
      .click();

    // Should be back to No NAS state automatically since we deleted the active profile
    await expect(page.getByText('Add NAS')).toBeVisible();
  });
});
