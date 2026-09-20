import { test, expect } from './fixtures/extension';

test.describe('Real NAS Integration Suite', () => {
  const createdTaskIds = new Set<string>();

  test.skip(!process.env.R22E_TEST_NAS_URL, 'Skipping Real NAS tests because R22E_TEST_NAS_URL is not set.');

  async function getTasks(baseUrl: string, sid: string) {
    const listUrl = `${baseUrl}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=list&additional=detail&_sid=${sid}`;
    const listRes = await fetch(listUrl);
    const listJson = await listRes.json();
    if (!listJson.success) throw new Error(`Failed to list tasks: ${listJson.error?.code}`);
    return listJson.data.tasks || [];
  }

  // Idempotent and deterministic cleanup using raw Node.js fetch
  test.afterAll(async () => {
    if (createdTaskIds.size === 0) return;

    const nasUrl = process.env.R22E_TEST_NAS_URL!;
    const username = process.env.R22E_TEST_USERNAME!;
    const password = process.env.R22E_TEST_PASSWORD!;
    const baseUrl = nasUrl.replace(/\/$/, '');
    
    try {
      const authUrl = `${baseUrl}/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${encodeURIComponent(username)}&passwd=${encodeURIComponent(password)}&session=DownloadStation&format=sid`;
      const authRes = await fetch(authUrl);
      const authJson = await authRes.json();
      
      if (!authJson.success || !authJson.data?.sid) {
        throw new Error('Teardown authentication failed (2FA is strictly unsupported in this test harness per safety rules).');
      }
      const sid = authJson.data.sid;
      
      const taskIds = Array.from(createdTaskIds).join(',');
      const deleteUrl = `${baseUrl}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=delete&id=${encodeURIComponent(taskIds)}&force_complete=true&_sid=${sid}`;
      const deleteRes = await fetch(deleteUrl);
      const deleteJson = await deleteRes.json();

      if (!deleteJson.success) {
        throw new Error(`API delete command failed with code ${deleteJson.error?.code}`);
      }

      const tasks = await getTasks(baseUrl, sid);
      const remainingIds = new Set(tasks.map((t: any) => t.id));
      const leakedIds = Array.from(createdTaskIds).filter(id => remainingIds.has(id));

      if (leakedIds.length > 0) {
        throw new Error(`Task deletion verified failed! Leaked task IDs remaining on NAS: ${leakedIds.join(', ')}`);
      }
      
      createdTaskIds.clear();
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(true, `FATAL CLEANUP FAILURE: ${msg}. Remaining task IDs: ${Array.from(createdTaskIds).join(',')}`).toBe(false);
    }
  });

  test('end-to-end integration flow safely isolated', async ({ page, gotoOptions, gotoPopup }) => {
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS Connection' }).click();
    
    const nasUrl = process.env.R22E_TEST_NAS_URL!;
    const username = process.env.R22E_TEST_USERNAME!;
    const password = process.env.R22E_TEST_PASSWORD!;
    const destination = process.env.R22E_TEST_DESTINATION || '';
    const baseUrl = nasUrl.replace(/\/$/, '');
    
    // Save profile (no auth happens here)
    await page.getByLabel(/NAS URL/i).fill(nasUrl);
    await page.getByLabel(/Username/i).fill(username);
    await page.getByRole('button', { name: 'Save Profile' }).click();
    
    // Open Popup to trigger real Auth Flow
    await gotoPopup(page);
    
    // Fill password in popup login screen
    await page.getByLabel(/Password/i).fill(password);
    const loginResponsePromise = page.waitForResponse(r => r.url().includes('api=SYNO.API.Auth') && r.url().includes('method=login'));
    await page.getByRole('button', { name: 'Login' }).click();
    
    const loginResponse = await loginResponsePromise;
    const loginJson = await loginResponse.json();
    expect(loginJson?.data?.sid, 'Login must yield a valid SID').toBeDefined();
    const activeSid = loginJson.data.sid;
    
    await expect(page.getByText('Disconnected')).toBeHidden({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Add Task/i })).toBeVisible();

    // Snapshot state
    const preTasks = await getTasks(baseUrl, activeSid);
    const preTaskIds = new Set(preTasks.map((t: any) => t.id));

    // HTTP Task
    const uniqueNonce = Math.random().toString(36).substring(2, 10);
    
    const testUrl = `https://proof.ovh.net/robots.txt?r22e-e2e=${uniqueNonce}`;

    await page.getByRole('button', { name: /Add Task/i }).click();
    await page.getByLabel(/URL/i).fill(testUrl);
    if (destination) {
      await page.getByLabel(/Destination/i).fill(destination);
    }
    
    await page.getByRole('button', { name: 'Add' }).click();
    
    // Poll to discover exact new ID
    let discoveredHttpId: string | null = null;
    await expect.poll(async () => {
      const currentTasks = await getTasks(baseUrl, activeSid);
      const newTasks = currentTasks.filter((t: any) => !preTaskIds.has(t.id));
      const exactMatch = newTasks.find((t: any) => t.additional?.detail?.uri === testUrl);
      if (exactMatch) {
        discoveredHttpId = exactMatch.id;
        return true;
      }
      return false;
    }, { message: 'Failed to discover unique HTTP task by URL', timeout: 15000 }).toBe(true);

    expect(discoveredHttpId).toBeTruthy();
    createdTaskIds.add(discoveredHttpId!);
    
    // Test Pause/Resume via UI
    const httpTaskCard = page.locator('.r22e-card').filter({ hasText: 'robots.txt' }).first();
    await httpTaskCard.getByRole('button', { name: /Pause/i }).click();
    await httpTaskCard.getByRole('button', { name: /Resume/i }).click();

    // Verify UI Deletion
    await httpTaskCard.getByRole('button', { name: /Delete/i }).click();
    await expect(page.getByText('robots.txt').first()).toBeHidden({ timeout: 10000 });
    createdTaskIds.delete(discoveredHttpId!);

    // Magnet Task (Fake BTIH to prevent swarming)
    const magnetTitle = `r22e-e2e-magnet-${uniqueNonce}`;
    const magnetUri = `magnet:?xt=urn:btih:0000000000000000000000000000000000000000&dn=${magnetTitle}`;
    
    await page.getByRole('button', { name: /Add Task/i }).click();
    await page.getByLabel(/URL/i).fill(magnetUri);
    await page.getByRole('button', { name: 'Add' }).click();

    let discoveredMagnetId: string | null = null;
    await expect.poll(async () => {
      const currentTasks = await getTasks(baseUrl, activeSid);
      // Wait for our exact magnet to appear
      const exactMatch = currentTasks.find((t: any) => t.additional?.detail?.uri === magnetUri);
      if (exactMatch) {
        discoveredMagnetId = exactMatch.id;
        return true;
      }
      return false;
    }, { message: 'Failed to discover unique Magnet task by URI', timeout: 15000 }).toBe(true);

    expect(discoveredMagnetId).toBeTruthy();
    createdTaskIds.add(discoveredMagnetId!);

    // IMMEDIATELY pause the magnet to halt any resolution
    const magnetTaskCard = page.locator('.r22e-card').filter({ hasText: magnetTitle }).first();
    await magnetTaskCard.getByRole('button', { name: /Pause/i }).click();
    
    await page.reload();
    await expect(page.getByText('Disconnected')).toBeHidden({ timeout: 15000 });
  });
});
