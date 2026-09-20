import { test, expect } from './fixtures/extension';

test.describe('Real NAS Integration Suite', () => {
  // Test tasks we created and need to clean up
  const createdTaskIds = new Set<string>();

  test.skip(!process.env.R22E_TEST_NAS_URL, 'Skipping Real NAS tests because R22E_TEST_NAS_URL is not set.');

  // Idempotent and deterministic cleanup using raw Node.js fetch to avoid UI brittleness
  test.afterAll(async () => {
    if (createdTaskIds.size === 0) return;

    const nasUrl = process.env.R22E_TEST_NAS_URL!;
    const username = process.env.R22E_TEST_USERNAME!;
    const password = process.env.R22E_TEST_PASSWORD!;
    
    // Mask URL for logs
    const maskedUrl = nasUrl.replace(/(https?:\/\/)([^@/]+@)?([^/]+)/, '$1***@***');
    console.log(`[Teardown] Starting deterministic API cleanup for ${createdTaskIds.size} task(s) on ${maskedUrl}...`);
    
    try {
      const baseUrl = nasUrl.replace(/\/$/, '');
      // 1. Auth to get a fresh SID
      const authUrl = `${baseUrl}/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${encodeURIComponent(username)}&passwd=${encodeURIComponent(password)}&session=DownloadStation&format=sid`;
      const authRes = await fetch(authUrl);
      const authJson = await authRes.json();
      
      if (!authJson.success || !authJson.data?.sid) {
        throw new Error('Failed to authenticate for cleanup.');
      }
      const sid = authJson.data.sid;
      
      // 2. Delete the created tasks
      const taskIds = Array.from(createdTaskIds).join(',');
      const deleteUrl = `${baseUrl}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=delete&id=${encodeURIComponent(taskIds)}&force_complete=true&_sid=${sid}`;
      const deleteRes = await fetch(deleteUrl);
      const deleteJson = await deleteRes.json();

      if (deleteJson.success) {
        console.log(`[Teardown] Successfully cleaned up task(s).`);
        createdTaskIds.clear();
      } else {
        console.error(`[Teardown] Failed to clean up tasks: ${JSON.stringify(deleteJson.error)}. Remaining task IDs: ${taskIds}`);
      }
    } catch (err) {
      console.error(`[Teardown] Fatal error during cleanup fetch. Remaining task IDs: ${Array.from(createdTaskIds).join(',')}`, err);
    }
  });

  test('end-to-end integration flow safely isolated', async ({ page, gotoOptions, gotoPopup }) => {
    // 1. API Discovery & 2. Login
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS Connection' }).click();
    
    const nasUrl = process.env.R22E_TEST_NAS_URL!;
    const username = process.env.R22E_TEST_USERNAME!;
    const password = process.env.R22E_TEST_PASSWORD!;
    const destination = process.env.R22E_TEST_DESTINATION || '';
    
    await page.getByLabel(/NAS URL/i).fill(nasUrl);
    await page.getByLabel(/Username/i).fill(username);
    await page.getByLabel(/Password/i).fill(password);
    await page.getByRole('button', { name: 'Save Profile' }).click();
    
    await expect(page.getByText('Validating connection...')).toBeVisible();
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 15000 });

    // 3. Capabilities, 4. Task List, 5. Aggregate statistics
    await gotoPopup(page);
    await expect(page.getByText('Disconnected')).toBeHidden({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Add Task/i })).toBeVisible();

    // 6. Create HTTP task and intercept the response to capture the real task ID
    await page.getByRole('button', { name: /Add Task/i }).click();
    await page.getByLabel(/URL/i).fill('https://releases.ubuntu.com/22.04.3/ubuntu-22.04.3-live-server-amd64.iso.zsync');
    if (destination) {
      await page.getByLabel(/Destination/i).fill(destination);
    }
    
    const responsePromise = page.waitForResponse(response => response.url().includes('DownloadStation/task.cgi') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Add' }).click();
    
    try {
      const response = await responsePromise;
      const json = await response.json();
      if (json && json.success && json.data && Array.isArray(json.data.task_ids)) {
         json.data.task_ids.forEach((id: string) => createdTaskIds.add(id));
      } else {
         throw new Error('Could not parse task ID from response');
      }
    } catch (e) {
      // FAIL immediately if we cannot reliably track created resources
      expect(true, 'Test aborted: Task creation response could not be parsed to track ID for cleanup.').toBe(false);
    }
    
    // Wait for the task to appear in the list
    await expect(page.getByText('ubuntu-22.04.3')).toBeVisible({ timeout: 10000 });
    
    // 9. Pause
    const taskCard = page.locator('.r22e-card').filter({ hasText: 'ubuntu-22.04.3' }).first();
    await taskCard.getByRole('button', { name: /Pause/i }).click();
    
    // 10. Resume
    await taskCard.getByRole('button', { name: /Resume/i }).click();

    // 13. Delete created test task via UI
    await taskCard.getByRole('button', { name: /Delete/i }).click();
    await expect(page.getByText('ubuntu-22.04.3')).toBeHidden({ timeout: 10000 });
    
    // 14. Session recovery
    await page.reload();
    await expect(page.getByText('Disconnected')).toBeHidden({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Add Task/i })).toBeVisible();
  });
});
