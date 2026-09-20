import { test, expect } from './fixtures/extension';

test.describe('Real NAS Integration Suite', () => {
  const createdTaskIds = new Set<string>();
  let activeSid: string | null = null; // Store active session to bypass 2FA re-auth

  test.skip(!process.env.R22E_TEST_NAS_URL, 'Skipping Real NAS tests because R22E_TEST_NAS_URL is not set.');

  // Idempotent and deterministic cleanup using raw Node.js fetch
  test.afterAll(async () => {
    if (createdTaskIds.size === 0) return;

    const nasUrl = process.env.R22E_TEST_NAS_URL!;
    const username = process.env.R22E_TEST_USERNAME!;
    const password = process.env.R22E_TEST_PASSWORD!;
    const baseUrl = nasUrl.replace(/\/$/, '');
    
    try {
      let sid = activeSid;
      if (!sid) {
        // Fallback to re-authentication if we never extracted a SID (e.g. test failed very early)
        const authUrl = `${baseUrl}/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${encodeURIComponent(username)}&passwd=${encodeURIComponent(password)}&session=DownloadStation&format=sid`;
        const authRes = await fetch(authUrl);
        const authJson = await authRes.json();
        
        if (!authJson.success || !authJson.data?.sid) {
          throw new Error('Fallback authentication failed (possibly due to 2FA).');
        }
        sid = authJson.data.sid;
      }
      
      // 1. Delete tasks
      const taskIds = Array.from(createdTaskIds).join(',');
      const deleteUrl = `${baseUrl}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=delete&id=${encodeURIComponent(taskIds)}&force_complete=true&_sid=${sid}`;
      const deleteRes = await fetch(deleteUrl);
      const deleteJson = await deleteRes.json();

      if (!deleteJson.success) {
        throw new Error(`API delete command failed with code ${deleteJson.error?.code}`);
      }

      // 2. Verify deletion via List API
      const listUrl = `${baseUrl}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=list&_sid=${sid}`;
      const listRes = await fetch(listUrl);
      const listJson = await listRes.json();

      if (!listJson.success) {
        throw new Error(`Failed to list tasks for cleanup verification, code: ${listJson.error?.code}`);
      }

      const remainingIds = new Set(listJson.data.tasks.map((t: any) => t.id));
      const leakedIds = Array.from(createdTaskIds).filter(id => remainingIds.has(id));

      if (leakedIds.length > 0) {
        throw new Error(`Task deletion verified failed! Leaked task IDs remaining on NAS: ${leakedIds.join(', ')}`);
      }
      
      createdTaskIds.clear();
    } catch (err: any) {
      // Must explicitly fail the suite
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
    
    await page.getByLabel(/NAS URL/i).fill(nasUrl);
    await page.getByLabel(/Username/i).fill(username);
    await page.getByLabel(/Password/i).fill(password);
    
    const loginResponsePromise = page.waitForResponse(r => r.url().includes('api=SYNO.API.Auth') && r.url().includes('method=login'));
    await page.getByRole('button', { name: 'Save Profile' }).click();
    
    const loginResponse = await loginResponsePromise;
    const loginJson = await loginResponse.json();
    if (loginJson?.data?.sid) {
      activeSid = loginJson.data.sid;
    }
    
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 15000 });

    await gotoPopup(page);
    await expect(page.getByText('Disconnected')).toBeHidden({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Add Task/i })).toBeVisible();

    // Small test payload to minimize side-effects
    const testFileName = 'robots.txt';
    const testUrl = 'https://proof.ovh.net/robots.txt';

    await page.getByRole('button', { name: /Add Task/i }).click();
    await page.getByLabel(/URL/i).fill(testUrl);
    if (destination) {
      await page.getByLabel(/Destination/i).fill(destination);
    }
    
    let httpTaskId: string | null = null;
    const responsePromise = page.waitForResponse(response => response.url().includes('DownloadStation/task.cgi') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Add' }).click();
    
    try {
      const response = await responsePromise;
      const json = await response.json();
      if (json && json.success && json.data && Array.isArray(json.data.task_ids)) {
         json.data.task_ids.forEach((id: string) => {
           createdTaskIds.add(id);
           httpTaskId = id;
         });
      } else {
         throw new Error('Could not parse task ID from response');
      }
    } catch (e) {
      expect(true, 'Test aborted: Task creation response could not be parsed to track ID for cleanup.').toBe(false);
    }
    
    await expect(page.getByText(testFileName)).toBeVisible({ timeout: 10000 });
    
    // Magnet creation test (uses deterministic Ubuntu test magnet)
    await page.getByRole('button', { name: /Add Task/i }).click();
    await page.getByLabel(/URL/i).fill('magnet:?xt=urn:btih:3b45a6c6a2d9b15250438c82348ff98e72322eb6&dn=ubuntu-test-magnet.iso');
    const magnetPromise = page.waitForResponse(response => response.url().includes('DownloadStation/task.cgi') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Add' }).click();

    try {
      const response = await magnetPromise;
      const json = await response.json();
      if (json && json.success && json.data && Array.isArray(json.data.task_ids)) {
         json.data.task_ids.forEach((id: string) => createdTaskIds.add(id));
      }
    } catch (e) {
      expect(true, 'Test aborted: Magnet task creation response could not be parsed to track ID for cleanup.').toBe(false);
    }
    await expect(page.getByText('ubuntu-test-magnet.iso')).toBeVisible({ timeout: 10000 });
    
    const taskCard = page.locator('.r22e-card').filter({ hasText: testFileName }).first();
    await taskCard.getByRole('button', { name: /Pause/i }).click();
    await taskCard.getByRole('button', { name: /Resume/i }).click();

    // Verify UI Deletion removes the tracker
    await taskCard.getByRole('button', { name: /Delete/i }).click();
    await expect(page.getByText(testFileName).first()).toBeHidden({ timeout: 10000 });
    if (httpTaskId) {
      createdTaskIds.delete(httpTaskId);
    }
    
    await page.reload();
    await expect(page.getByText('Disconnected')).toBeHidden({ timeout: 15000 });
  });
});
