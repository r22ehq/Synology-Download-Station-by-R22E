import { test, expect } from './fixtures/extension';
import { addMockNasAndConnect } from './fixtures/setup-flow';

declare const chrome: {
  storage: {
    session: { clear: () => Promise<void> };
    local: { get: (key: string | null) => Promise<Record<string, unknown>>; remove: (key: string) => Promise<void> };
  };
  runtime: { reload: () => void };
};

test.describe('Authentication flows', () => {
  test('handles successful login and task loading', async ({ page, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'SUCCESS';
    mockNas.state.tasks = [
      {
        id: 'task1',
        title: 'Test Download',
        status: 'downloading',
        size: 1000,
        type: 'http',
        username: 'admin',
        additional: {
          transfer: { size_downloaded: 500, size_uploaded: 0, speed_download: 0, speed_upload: 0 },
        },
      },
    ];

    await gotoPopup(page);
    await addMockNasAndConnect(page, mockNas);

    await expect(page.getByText('Test Download')).toBeVisible({ timeout: 10000 });
  });

  test('displays OTP UI when required and handles correct OTP', async ({
    page,
    gotoPopup,
    mockNas,
  }) => {
    mockNas.state.authStatus = 'OTP_REQUIRED';
    mockNas.state.tasks = [
      {
        id: 'task2',
        title: 'OTP Task',
        status: 'downloading',
        size: 500,
        type: 'http',
        username: 'admin',
        additional: {
          transfer: { size_downloaded: 100, size_uploaded: 0, speed_download: 0, speed_upload: 0 },
        },
      },
    ];

    await gotoPopup(page);
    await addMockNasAndConnect(page, mockNas);

    // Should show OTP input
    await expect(page.getByLabel('Verification code')).toBeVisible({ timeout: 10000 });

    await page.getByLabel('Verification code').fill('000000');
    await page.getByRole('button', { name: /Verify/i }).click();

    // Wait for the button to be re-enabled after failure
    await expect(page.getByRole('button', { name: /Verify/i })).toBeEnabled();

    // Submit correct OTP
    await page.getByLabel('Verification code').fill('123456');
    await page.getByRole('button', { name: /Verify/i }).click();

    // After successful OTP, should show tasks
    await expect(page.getByText('OTP Task')).toBeVisible({ timeout: 10000 });
  });

  test('handles invalid credentials', async ({ page, gotoPopup, mockNas }) => {
    mockNas.state.authStatus = 'INVALID_CREDENTIALS';

    await gotoPopup(page);
    await addMockNasAndConnect(page, mockNas, 'wrongpass');

    // Should show error message or keep login form visible
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('status')).toContainText('Incorrect username or password.');
  });

  test('restores a remembered session and uses an opt-in saved password after restart', async ({ page, context, gotoPopup, mockNas }) => {
    let appPage = page;
    mockNas.state.authStatus = 'SUCCESS';
    await gotoPopup(page);
    await page.getByText('Add NAS').click();
    await page.getByRole('button', { name: /Local HTTP Port 5000/ }).click();
    await page.getByLabel(/^NAS address$/i).fill(mockNas.getUrl());
    await expect(page.getByLabel('Username', { exact: true })).toBeEnabled();
    await page.getByLabel(/Username/i).fill('admin');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('checkbox', { name: /Remember this device/ }).check();
    await page.getByRole('checkbox', { name: /Save password on this device/ }).check();
    await page.getByRole('button', { name: 'Save and connect' }).click();
    await expect(page.getByPlaceholder(/Paste URL/i)).toBeVisible();

    // Simulate browser restart's session-storage loss and terminate the MV3 worker.
    // chrome.runtime.reload() disables a side-loaded extension in Playwright's Chromium.
    await appPage.evaluate(async () => chrome.storage.session.clear());
    const stopWorker = async () => {
      const cdp = await context.newCDPSession(appPage);
      const updated = new Promise<{ versions: Array<{ versionId: string; scriptURL: string }> }>(resolve => {
        cdp.once('ServiceWorker.workerVersionUpdated', resolve);
      });
      await cdp.send('ServiceWorker.enable');
      const { versions } = await updated;
      const worker = versions.find(version => version.scriptURL.startsWith('chrome-extension://'));
      if (worker) await cdp.send('ServiceWorker.stopWorker', { versionId: worker.versionId });
      await cdp.detach();
    };
    await stopWorker();
    await appPage.close();
    appPage = await context.newPage();
    await gotoPopup(appPage);
    await expect(appPage.getByPlaceholder(/Paste URL/i)).toBeVisible();

    // Once the remembered session expires, the saved password signs in again.
    const loginsBefore = mockNas.requestCounts['SYNO.API.Auth'] || 0;
    await appPage.evaluate(async () => {
      const { activeProfileId } = await chrome.storage.local.get('activeProfileId');
      await chrome.storage.local.remove(`rememberedSession_${activeProfileId}`);
      await chrome.storage.session.clear();
    });
    await stopWorker();
    await appPage.close();
    appPage = await context.newPage();
    await gotoPopup(appPage);
    const authStorage = await appPage.evaluate(async () => {
      const values = await chrome.storage.local.get(null);
      const id = values.activeProfileId;
      return {
        hasId: typeof id === 'string',
        saved: typeof values[`savedPassword_${id}`] === 'string',
        suppressed: values[`autoLoginSuppressed_${id}`] === true,
      };
    });
    expect(authStorage).toEqual({ hasId: true, saved: true, suppressed: false });
    await expect(appPage.getByPlaceholder(/Paste URL/i)).toBeVisible();
    await expect.poll(() => mockNas.requestCounts['SYNO.API.Auth'] || 0).toBeGreaterThan(loginsBefore);

    await appPage.getByRole('button', { name: 'More actions' }).click();
    await appPage.getByRole('button', { name: 'Log out' }).click();
    await gotoPopup(appPage);
    await expect(appPage.getByText('Login Required')).toBeVisible();
    await expect(appPage.getByRole('checkbox', { name: /Save password on this device/ })).toBeChecked();
    await appPage.getByRole('button', { name: 'Login' }).click();
    await expect(appPage.getByPlaceholder(/Paste URL/i)).toBeVisible();
  });
});
