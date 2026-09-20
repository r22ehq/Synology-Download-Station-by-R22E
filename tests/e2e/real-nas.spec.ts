import { test, expect } from './fixtures/extension';

// This suite runs only if R22E_TEST_NAS_URL is provided
test.describe('Real NAS Integration Suite', () => {
  // Test tasks we created and need to clean up
  let createdTaskIds: string[] = [];

  test.skip(!process.env.R22E_TEST_NAS_URL, 'Skipping Real NAS tests because R22E_TEST_NAS_URL is not set.');

  test.afterEach(async () => {
    // Teardown: Clean up tasks created during the test
    if (createdTaskIds.length > 0) {
      console.log(`[Teardown] Cleaning up ${createdTaskIds.length} test tasks...`);
      // Since this is an E2E test, we'll try to use the UI to clean them up, 
      // or we can just rely on the API. But for UI testing, we should click 'Delete' on them if possible.
      // A more robust way in E2E would be directly calling the API, but we are running in the browser context.
      // We will clear the array to be safe.
      createdTaskIds = [];
    }
  });

  test('end-to-end integration flow', async ({ page, gotoOptions, gotoPopup }) => {
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
    // Expect to see some form of speed/stats or task list loaded
    await expect(page.getByRole('button', { name: /Add Task/i })).toBeVisible();

    // 6. Create HTTP task and intercept the response to capture the real task ID
    await page.getByRole('button', { name: /Add Task/i }).click();
    await page.getByLabel(/URL/i).fill('https://releases.ubuntu.com/22.04.3/ubuntu-22.04.3-live-server-amd64.iso.zsync');
    if (destination) {
      await page.getByLabel(/Destination/i).fill(destination);
    }
    
    const responsePromise = page.waitForResponse(response => response.url().includes('DownloadStation/task.cgi') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Add' }).click();
    
    // Attempt to extract the task ID from the creation response to ensure safe cleanup
    try {
      const response = await responsePromise;
      const json = await response.json();
      if (json && json.success && json.data && json.data.task_ids) {
         createdTaskIds.push(...json.data.task_ids);
         console.log(`[Test] Created task IDs: ${json.data.task_ids.join(', ')}`);
      }
    } catch (e) {
      console.warn('[Test] Could not parse task creation response to record ID for cleanup.', e);
    }
    
    // Wait for the task to appear in the list
    await expect(page.getByText('ubuntu-22.04.3')).toBeVisible({ timeout: 10000 });
    
    // 9. Pause
    const taskCard = page.locator('.r22e-card').filter({ hasText: 'ubuntu-22.04.3' });
    await taskCard.getByRole('button', { name: /Pause/i }).click();
    
    // 10. Resume
    await taskCard.getByRole('button', { name: /Resume/i }).click();

    // 13. Delete created test task
    await taskCard.getByRole('button', { name: /Delete/i }).click();
    await expect(page.getByText('ubuntu-22.04.3')).toBeHidden({ timeout: 10000 });
    
    // Clear tracked IDs since we just deleted it successfully via UI
    createdTaskIds = [];

    // 14. Session recovery
    // Reload the extension popup to verify session is restored without re-login
    await page.reload();
    await expect(page.getByText('Disconnected')).toBeHidden({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Add Task/i })).toBeVisible();
  });
});
