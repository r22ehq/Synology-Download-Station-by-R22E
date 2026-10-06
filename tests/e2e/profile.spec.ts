import { test, expect } from './fixtures/extension';
import { tmpdir } from 'node:os';
import path from 'node:path';

test.describe('Profile Configuration', () => {
  test('uses borderless connection choices with a selected background', async ({ page, gotoOptions }) => {
    await page.setViewportSize({ width: 580, height: 520 });
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS' }).click();
    const local = page.getByRole('radio', { name: /^Local Recommended/ });
    const quickConnect = page.getByRole('radio', { name: /^QuickConnect Unofficial/ });
    const http = page.getByRole('button', { name: /Local HTTP Port 5000/ });
    const https = page.getByRole('button', { name: /Local HTTPS Port 5001/ });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      for (const choice of [local.locator('..'), quickConnect.locator('..'), http, https]) {
        await expect(choice).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
      }
      await http.click();
      await expect(http).toHaveAttribute('aria-pressed', 'true');
      await expect(https).toHaveAttribute('aria-pressed', 'false');
      expect(await http.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
      await https.click();
      await expect(https).toHaveAttribute('aria-pressed', 'true');
      await quickConnect.check();
      await expect(quickConnect).toBeChecked();
      expect(await quickConnect.locator('..').evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
      await local.check();
    }
    await http.click();
    await page.keyboard.press('Tab');
    await expect(https).toBeFocused();
    await expect(https).toHaveCSS('outline-style', 'solid');
    expect(await page.locator('[class*="formCard"]').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.setViewportSize({ width: 900, height: 760 });
    await http.click();
    await page.getByRole('heading', { name: 'New connection' }).click();
    await page.screenshot({ path: path.join(tmpdir(), 'r22e-015-borderless-connection.png') });
  });

  test('reaches a real HTTPS NAS from the extension without credentials', async ({ page, gotoOptions }) => {
    const url = process.env.R22E_TEST_NAS_URL;
    test.skip(!url, 'Set R22E_TEST_NAS_URL to run this read-only NAS check.');
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS' }).click();
    await page.getByLabel(/^NAS address$/i).fill(url!);
    await expect(page.getByLabel('Username', { exact: true })).toBeEnabled();
    await page.getByLabel(/Username/i).fill('connection-check');
    await page.getByRole('button', { name: 'Test connection' }).click();
    await expect(page.getByRole('status')).toContainText('Connection successful. Auth skipped.', { timeout: 20000 });
  });

  test('reaches a real HTTP NAS after selecting Local HTTP, without credentials', async ({ page, gotoOptions }) => {
    const url = process.env.R22E_TEST_NAS_HTTP_URL;
    test.skip(!url, 'Set R22E_TEST_NAS_HTTP_URL to run this read-only NAS check.');
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS' }).click();
    await page.getByRole('button', { name: /Local HTTP Port 5000/ }).click();
    await page.getByLabel(/^NAS address$/i).fill(url!);
    await expect(page.getByLabel('Username', { exact: true })).toBeEnabled();
    await page.getByLabel(/Username/i).fill('connection-check');
    await page.getByRole('button', { name: 'Test connection' }).click();
    await expect(page.getByRole('status')).toContainText('Connection successful. Auth skipped.', { timeout: 20000 });
  });

  test('can discover and test a real direct QuickConnect endpoint without logging in', async ({ page, gotoOptions }) => {
    const id = process.env.R22E_QC_ID;
    test.skip(!id, 'Set R22E_QC_ID to run this read-only NAS check.');
    await gotoOptions(page);
    await page.getByText('Add NAS').click();
    await page.getByRole('radio', { name: /^QuickConnect Unofficial/ }).check();
    await page.getByRole('textbox', { name: 'QuickConnect ID' }).fill(id!);
    await page.getByRole('button', { name: 'Find direct NAS address' }).click();
    await expect(page.getByLabel('Username', { exact: true })).toBeEnabled();
    await page.getByRole('textbox', { name: 'Username' }).fill('connection-check');
    await page.getByRole('button', { name: 'Test connection' }).click();
    await expect(page.getByRole('status')).toContainText('Connection successful. Auth skipped.', { timeout: 20000 });
  });

  test('shows local as recommended and clearly warns about experimental QuickConnect', async ({ page, gotoOptions }) => {
    await gotoOptions(page);
    await page.getByText('Add NAS').click();
    await expect(page.getByRole('radio', { name: /^Local Recommended/ })).toBeChecked();
    await expect(page.getByRole('group', { name: 'Connection method' }).getByText('Recommended', { exact: true })).toBeVisible();
    await page.getByRole('radio', { name: /^QuickConnect Unofficial/ }).check();
    await expect(page.getByRole('textbox', { name: 'QuickConnect ID' })).toBeVisible();
    await expect(page.getByText('Unofficial · may break')).toBeVisible();
    await expect(page.getByText(/Direct connections only; relay is not supported/)).toBeVisible();
    await expect(page.getByLabel(/^NAS address$/i)).toHaveCount(0);
    await page.setViewportSize({ width: 580, height: 720 });
    await page.screenshot({ path: path.join(tmpdir(), 'r22e-quickconnect-setup-580.png') });
  });

  test('saves and signs in from one setup page, then removes the profile', async ({
    page,
    gotoOptions,
    mockNas,
  }) => {
    await gotoOptions(page);
    await expect(page).toHaveURL(/\/options\.html$/);
    await expect(page).toHaveTitle('R22E Station — Settings');
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);

    // In empty state, click Add NAS
    await page.getByText('Add NAS').click();

    // Fill form
    await page.getByRole('button', { name: /Local HTTP Port 5000/ }).click();
    await page.getByLabel(/^NAS address$/i).fill(mockNas.getUrl());
    await expect(page.getByLabel('Username', { exact: true })).toBeEnabled();
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Test connection' }).click();
    await expect(page.getByRole('status')).toContainText('Connection and authentication successful.');
    await expect(page.getByRole('heading', { name: 'New connection' })).toBeVisible();
    await page.getByRole('button', { name: 'Save and connect' }).click();

    await expect(page.getByText('Connected', { exact: true })).toBeVisible();
    await expect(page.getByText('Login Required', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: path.join(tmpdir(), `r22e-login-race-fixed-${process.env.R22E_BROWSER_CHANNEL || 'chromium'}.png`) });

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

  test('opens setup in the same popup', async ({ page, context, gotoPopup }) => {
    await gotoPopup(page);
    const pagesBefore = context.pages().length;
    await page.getByRole('button', { name: 'Add NAS' }).click();
    await expect(page.getByRole('heading', { name: 'New connection' })).toBeVisible();
    await expect(page).toHaveURL(/popup\.html$/);
    expect(context.pages()).toHaveLength(pagesBefore);
  });

  test('switches between editable Local HTTPS and Local HTTP addresses', async ({ page, gotoOptions }) => {
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS' }).click();
    await page.getByRole('button', { name: /Local HTTPS Port 5001/ }).click();
    await expect(page.getByLabel(/^NAS address$/i)).toHaveValue('https://');
    const certificateGuide = page.getByRole('link', { name: 'HTTPS certificate guide' });
    await expect(certificateGuide).toBeVisible();
    await expect(certificateGuide).toHaveAttribute('href', 'https://kb.synology.com/en-my/DSM/tutorial/Why_did_I_see_a_not_secure_warning_in_the_browser_when_connecting_to_my_Synology_product');
    await expect(certificateGuide).toHaveAttribute('target', '_blank');
    await expect(certificateGuide).toHaveAttribute('rel', 'noopener noreferrer');
    await page.getByLabel(/^NAS address$/i).fill('https://nas.example.direct.quickconnect.to:5001');
    await expect(page.getByText(/QuickConnect address, not an independent local hostname/i)).toBeVisible();
    await page.getByLabel(/^NAS address$/i).fill('192.168.0.81');
    await expect(page.getByText(/IP may not match your NAS certificate/i)).toBeVisible();
    await page.getByRole('button', { name: /Local HTTP Port 5000/ }).click();
    await expect(page.getByLabel(/^NAS address$/i)).toHaveValue('http://192.168.0.81:5000');
    await expect(page.getByText(/Not encrypted. Use only on a trusted local network/i)).toBeVisible();
    await expect(certificateGuide).toHaveCount(0);
    await page.getByLabel(/^NAS address$/i).fill('http://192.168.0.82:5000');
    await page.getByRole('button', { name: /Local HTTPS Port 5001/ }).click();
    await expect(page.getByLabel(/^NAS address$/i)).toHaveValue('https://192.168.0.82:5001');
    await expect(certificateGuide).toBeVisible();
    await page.getByLabel(/^NAS address$/i).fill('');
    await expect(page.getByLabel(/^NAS address$/i)).toHaveValue('');
  });

  test('labels HTTP clearly and keeps failed sign-in on the setup page', async ({ page, gotoOptions, mockNas }) => {
    mockNas.state.authStatus = 'INVALID_CREDENTIALS';
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS' }).click();
    await page.getByRole('button', { name: /Local HTTP Port 5000/ }).click();
    await page.getByLabel(/^NAS address$/i).fill(mockNas.getUrl());
    await expect(page.getByLabel('Username', { exact: true })).toBeEnabled();
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByPlaceholder('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
    await expect(page.getByText(/Not encrypted. Use only on a trusted local network/i)).toBeVisible();
    await page.getByRole('button', { name: 'Test connection' }).click();
    await expect(page.getByRole('status')).toContainText('Incorrect username or password.');
    await expect(page.getByRole('status')).not.toContainText('NAS could not be reached');
    await page.getByRole('button', { name: 'Save and connect' }).click();
    await expect(page.getByRole('heading', { name: 'New connection' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Incorrect username or password.');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('No NAS profiles have been added.')).toBeVisible();
  });

  test('completes two-step sign-in on the setup form', async ({ page, gotoOptions, mockNas }) => {
    mockNas.state.authStatus = 'OTP_REQUIRED';
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS' }).click();
    await page.getByRole('button', { name: /Local HTTP Port 5000/ }).click();
    await page.getByLabel(/^NAS address$/i).fill(mockNas.getUrl());
    await expect(page.getByLabel('Username', { exact: true })).toBeEnabled();
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByPlaceholder('Password').fill('password123');
    await page.getByRole('button', { name: 'Save and connect' }).click();
    await expect(page.getByLabel('Verification code')).toBeVisible();
    await page.getByLabel('Verification code').fill('123456');
    await page.getByRole('button', { name: 'Verify and connect' }).click();
    await expect(page.getByText('Connected', { exact: true })).toBeVisible();
  });
});
