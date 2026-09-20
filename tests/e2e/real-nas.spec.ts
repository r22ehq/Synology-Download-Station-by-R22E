import { test, expect } from './fixtures/extension';
import crypto from 'crypto';
import { SynoHttpClient } from '../../src/core/synology/transport/http-client';
import { DiscoveryClient } from '../../src/core/synology/api-discovery/discovery-client';
import { AuthClient } from '../../src/core/synology/auth/auth-client';
import { normalizeNasUrl } from '../../src/core/domain/connection/nas-url';
import { TestResourceRegistry } from './fixtures/test-registry';
import type { TaskListApiResponse } from './fixtures/synology-types';

test.describe('Real NAS Integration Suite', () => {
  const registry = new TestResourceRegistry();
  let preExistingIds: string[] = [];
  let harnessSid: string;
  let nasUrl: string;
  let baseUrl: string;
  let username: string;

  test.skip(!process.env.R22E_TEST_NAS_URL, 'Skipping Real NAS tests because R22E_TEST_NAS_URL is not set.');

  test.beforeAll(async () => {
    nasUrl = normalizeNasUrl(process.env.R22E_TEST_NAS_URL!).baseUrl;
    baseUrl = nasUrl;
    username = process.env.R22E_TEST_USERNAME!;
    const password = process.env.R22E_TEST_PASSWORD!;
    
    // Independent harness auth
    const httpClient = new SynoHttpClient();
    const discovery = new DiscoveryClient(httpClient);
    const apiRegistry = await discovery.discoverApis(nasUrl);
    const auth = new AuthClient(httpClient);
    const loginResult = await auth.login(nasUrl, apiRegistry, username, password, { format: 'sid' });
    if (!loginResult.sid) throw new Error('Harness failed to authenticate');
    harnessSid = loginResult.sid;

    // Capture pre-existing
    const taskEndpoint = apiRegistry.resolveEndpoint('SYNO.DownloadStation.Task');
    const taskVersion = apiRegistry.getNegotiatedVersion('SYNO.DownloadStation.Task', 1);
    const listRes = await httpClient.get<TaskListApiResponse>(nasUrl, taskEndpoint, {
      params: { api: 'SYNO.DownloadStation.Task', version: taskVersion.toString(), method: 'list' },
      sid: harnessSid
    });
    preExistingIds = listRes.data?.tasks.map(t => t.id) || [];
  });

  async function getTasks() {
    const listUrl = `${baseUrl}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=list&additional=detail&_sid=${harnessSid}`;
    const listRes = await fetch(listUrl);
    const listJson = await listRes.json();
    if (!listJson.success) throw new Error(`Failed to list tasks: ${listJson.error?.code}`);
    return listJson.data.tasks || [];
  }

  test.afterAll(async () => {
    const pending = registry.getPendingDeletions();
    if (pending.length === 0) return;
    
    try {
      const taskIds = pending.map(t => t.id).join(',');
      const deleteUrl = `${baseUrl}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=delete&id=${encodeURIComponent(taskIds)}&force_complete=true&_sid=${harnessSid}`;
      const deleteRes = await fetch(deleteUrl);
      const deleteJson = await deleteRes.json();

      if (!deleteJson.success) {
        throw new Error(`API delete command failed with code ${deleteJson.error?.code}`);
      }

      const tasks = await getTasks();
      const remainingIds = new Set(tasks.map((t: any) => t.id));
      const leakedIds = pending.map(t => t.id).filter(id => remainingIds.has(id));

      if (leakedIds.length > 0) {
        throw new Error(`Task deletion verified failed! Leaked task IDs remaining on NAS: ${leakedIds.join(', ')}`);
      }
      
      // Verify pre-existing IDs are not harmed
      const missingPreExisting = preExistingIds.filter(id => !remainingIds.has(id) && !registry.getAll().find(r => r.id === id));
      if (missingPreExisting.length > 0) {
         console.warn(`WARNING: Some pre-existing tasks were missing at teardown. This might be external NAS cleanup. Missing: ${missingPreExisting.join(',')}`);
      }
      
      registry.clear();
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(true, `FATAL CLEANUP FAILURE: ${msg}. Remaining task IDs: ${pending.map(t => t.id).join(',')}`).toBe(false);
    }
  });

  test('end-to-end integration flow safely isolated', async ({ page, gotoOptions, gotoPopup }) => {
    const password = process.env.R22E_TEST_PASSWORD!;
    const destination = process.env.R22E_TEST_DESTINATION || '';
    
    // Product path auth
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS Connection' }).click();
    await page.getByLabel(/NAS URL/i).fill(nasUrl);
    await page.getByLabel(/Username/i).fill(username);
    await page.getByRole('button', { name: 'Save Profile' }).click();
    
    await gotoPopup(page);
    await page.getByLabel(/Password/i).fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Wait for UI success instead of network SID
    await expect(page.getByText('Disconnected')).toBeHidden({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Add Task/i })).toBeVisible();

    // 1. HTTP Task
    let currentTasks = await getTasks();
    let preTaskIds = new Set(currentTasks.map((t: any) => t.id));
    
    const uniqueNonce = Math.random().toString(36).substring(2, 10);
    const testUrl = `https://proof.ovh.net/robots.txt?r22e-e2e=${uniqueNonce}`;

    await page.getByRole('button', { name: /Add Task/i }).click();
    await page.getByLabel(/URL/i).fill(testUrl);
    if (destination) {
      await page.getByLabel(/Destination/i).fill(destination);
    }
    await page.getByRole('button', { name: 'Add' }).click();
    
    let discoveredHttpId: string | null = null;
    await expect.poll(async () => {
      const latestTasks = await getTasks();
      const exactMatches = latestTasks.filter((t: any) => t.additional?.detail?.uri === testUrl && !preTaskIds.has(t.id));
      if (exactMatches.length === 1) {
        discoveredHttpId = exactMatches[0].id;
        return true;
      }
      return exactMatches.length > 1 ? false : false; // Fail implicitly on multiple? Timeout will catch.
    }, { message: 'Failed to discover unique HTTP task by URL', timeout: 15000 }).toBe(true);

    expect(discoveredHttpId).toBeTruthy();
    registry.add({ id: discoveredHttpId!, kind: 'http', uri: testUrl, destination });

    // Verify UI Deletion works and removes from server
    const httpTaskCard = page.locator('.r22e-card').filter({ hasText: 'robots.txt' }).first();
    await httpTaskCard.getByRole('button', { name: /Delete/i }).click();
    await expect(page.getByText('robots.txt').first()).toBeHidden({ timeout: 10000 });
    
    // Verify absent on server
    await expect.poll(async () => {
      const latestTasks = await getTasks();
      return !latestTasks.some((t: any) => t.id === discoveredHttpId);
    }, { message: 'Failed to verify HTTP task server deletion', timeout: 10000 }).toBe(true);
    
    registry.markDeleted(discoveredHttpId!);

    // 2. Magnet Task (Random valid BTIH)
    currentTasks = await getTasks();
    preTaskIds = new Set(currentTasks.map((t: any) => t.id));
    
    const randomHex = crypto.randomBytes(20).toString('hex');
    const magnetTitle = `r22e-e2e-magnet-${uniqueNonce}`;
    const magnetUri = `magnet:?xt=urn:btih:${randomHex}&dn=${magnetTitle}`;
    
    await page.getByRole('button', { name: /Add Task/i }).click();
    await page.getByLabel(/URL/i).fill(magnetUri);
    if (destination) {
      await page.getByLabel(/Destination/i).fill(destination);
    }
    await page.getByRole('button', { name: 'Add' }).click();

    let discoveredMagnetId: string | null = null;
    await expect.poll(async () => {
      const latestTasks = await getTasks();
      const exactMatches = latestTasks.filter((t: any) => t.additional?.detail?.uri === magnetUri && !preTaskIds.has(t.id));
      if (exactMatches.length === 1) {
        discoveredMagnetId = exactMatches[0].id;
        return true;
      }
      return false;
    }, { message: 'Failed to discover unique Magnet task by URI', timeout: 15000 }).toBe(true);

    expect(discoveredMagnetId).toBeTruthy();
    registry.add({ id: discoveredMagnetId!, kind: 'magnet', uri: magnetUri, destination });

    const magnetTaskCard = page.locator('.r22e-card').filter({ hasText: magnetTitle }).first();
    
    // Pause, Resume, Pause
    await magnetTaskCard.getByRole('button', { name: /Pause/i }).click();
    await expect(magnetTaskCard.getByRole('button', { name: /Resume/i })).toBeVisible({ timeout: 10000 });
    
    await magnetTaskCard.getByRole('button', { name: /Resume/i }).click();
    await expect(magnetTaskCard.getByRole('button', { name: /Pause/i })).toBeVisible({ timeout: 10000 });
    
    await magnetTaskCard.getByRole('button', { name: /Pause/i }).click();
    
    await page.reload();
    await expect(page.getByText('Disconnected')).toBeHidden({ timeout: 15000 });
  });
});
