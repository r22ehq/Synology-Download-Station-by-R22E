import { test, expect } from './fixtures/extension';
import crypto from 'crypto';
import { SynoHttpClient } from '../../src/core/synology/transport/http-client';
import { DiscoveryClient } from '../../src/core/synology/api-discovery/discovery-client';
import { AuthClient } from '../../src/core/synology/auth/auth-client';
import { TestResourceRegistry } from './fixtures/test-registry';
import type { TaskListResponse, DownloadTask } from '../../src/core/synology/download-station/types';
import { loadRealNasTestConfig } from './fixtures/real-nas-config';
import type { RealNasTestConfig } from './fixtures/real-nas-config';

test.describe('Real NAS Integration Suite', () => {
  const resourceRegistry = new TestResourceRegistry();
  let config: RealNasTestConfig | null = null;
  let harnessSid: string = '';
  let taskEndpoint: string = '';
  let taskVersion: number = 1;
  let preExistingIds: string[] = [];

  test.skip(!process.env.R22E_TEST_NAS_URL, 'Skipping Real NAS tests because R22E_TEST_NAS_URL is not set.');
  test.skip(process.env.R22E_TEST_ALLOW_MUTATIONS !== 'YES', 'Skipping mutating suite because R22E_TEST_ALLOW_MUTATIONS is not exactly YES.');

  const httpClient = new SynoHttpClient();

  test.beforeAll(async () => {
    config = loadRealNasTestConfig();
    if (!config) return;
    
    // Harness strictly uses an independent Node client, NEVER intercepts the Product page
    const discovery = new DiscoveryClient(httpClient);
    const apiRegistry = await discovery.discoverApis(config.nasUrl);
    const auth = new AuthClient(httpClient);
    const loginResult = await auth.login(config.nasUrl, apiRegistry, config.username, config.password, { format: 'sid' });
    if (!loginResult.sid) throw new Error('Harness failed to authenticate');
    harnessSid = loginResult.sid;

    // Resolve endpoints once
    taskEndpoint = apiRegistry.resolveEndpoint('SYNO.DownloadStation.Task');
    taskVersion = apiRegistry.getNegotiatedVersion('SYNO.DownloadStation.Task', 1);

    // Capture pre-existing
    const listRes = await httpClient.get<TaskListResponse>(config.nasUrl, taskEndpoint, {
      params: { api: 'SYNO.DownloadStation.Task', version: taskVersion.toString(), method: 'list' },
      sid: harnessSid
    });
    preExistingIds = listRes.tasks?.map(t => t.id) || [];
  });

  async function getTasks(): Promise<DownloadTask[]> {
    if (!config) return [];
    const listRes = await httpClient.get<TaskListResponse>(config.nasUrl, taskEndpoint, {
      params: { api: 'SYNO.DownloadStation.Task', version: taskVersion.toString(), method: 'list', additional: 'detail' },
      sid: harnessSid
    });
    return listRes.tasks || [];
  }

  test.afterAll(async () => {
    if (!config) return;
    const pending = resourceRegistry.getPendingDeletions();
    if (pending.length === 0) return;
    
    try {
      const taskIds = pending.map(t => t.id).join(',');
      try {
        await httpClient.get<unknown>(config.nasUrl, taskEndpoint, {
          params: { api: 'SYNO.DownloadStation.Task', version: taskVersion.toString(), method: 'delete', id: taskIds, force_complete: 'true' },
          sid: harnessSid
        });
      } catch (err) {
        throw new Error(`API delete command failed: ${err}`);
      }

      const tasks = await getTasks();
      const remainingIds = new Set(tasks.map((t) => t.id));
      const leakedIds = pending.map(t => t.id).filter(id => remainingIds.has(id));

      if (leakedIds.length > 0) {
        throw new Error(`Task deletion verified failed! Leaked task IDs remaining on NAS: ${leakedIds.join(', ')}`);
      }
      
      // Verify pre-existing IDs are not harmed
      const missingPreExisting = preExistingIds.filter(id => !remainingIds.has(id) && !resourceRegistry.getAll().find(r => r.id === id));
      if (missingPreExisting.length > 0) {
         console.warn(`WARNING: Some pre-existing tasks were missing at teardown. This might be external NAS cleanup. Missing: ${missingPreExisting.join(',')}`);
      }
      
      resourceRegistry.clear();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`FATAL CLEANUP FAILURE: ${msg}. Remaining task IDs: ${pending.map(t => t.id).join(',')}`);
    }
  });

  test('end-to-end integration flow safely isolated', async ({ page, gotoOptions, gotoPopup }) => {
    if (!config) return;

    // Product path auth
    await gotoOptions(page);
    await page.getByRole('button', { name: 'Add NAS Connection' }).click();
    await page.getByLabel(/NAS URL/i).fill(config.nasUrl);
    await page.getByLabel(/Username/i).fill(config.username);
    await page.getByRole('button', { name: 'Save Profile' }).click();
    
    await gotoPopup(page);
    await page.getByLabel(/Password/i).fill(config.password);
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Wait for UI success instead of network SID
    await expect(page.getByText('Disconnected')).toBeHidden({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Add Task/i })).toBeVisible();

    // 1. HTTP Task
    let currentTasks = await getTasks();
    let preTaskIds = new Set(currentTasks.map((t) => t.id));
    
    const uniqueNonce = Math.random().toString(36).substring(2, 10);
    const testUrl = `https://proof.ovh.net/robots.txt?r22e-e2e=${uniqueNonce}`;

    await page.getByRole('button', { name: /Add Task/i }).click();
    await page.getByLabel(/URL/i).fill(testUrl);
    if (config.destination) {
      await page.getByLabel(/Destination/i).fill(config.destination);
    }
    await page.getByRole('button', { name: 'Add' }).click();
    
    let discoveredHttpId: string | null = null;
    await expect.poll(async () => {
      const latestTasks = await getTasks();
      const exactMatches = latestTasks.filter((t) => t.additional?.detail?.uri === testUrl && !preTaskIds.has(t.id));
      if (exactMatches.length > 1) {
         throw new Error(`Ambiguous task discovery: found ${exactMatches.length} tasks matching URL ${testUrl}`);
      }
      if (exactMatches.length === 1) {
        discoveredHttpId = exactMatches[0]!.id;
        return true;
      }
      return false;
    }, { message: 'Failed to discover unique HTTP task by URL', timeout: 15000 }).toBe(true);

    expect(discoveredHttpId).toBeTruthy();
    resourceRegistry.add({ id: discoveredHttpId!, kind: 'http', uri: testUrl, destination: config.destination });

    // Verify UI Deletion works and removes from server
    const httpTaskCard = page.locator('.r22e-card').filter({ hasText: 'robots.txt' }).first();
    await httpTaskCard.getByRole('button', { name: /Delete/i }).click();
    await expect(page.getByText('robots.txt').first()).toBeHidden({ timeout: 10000 });
    
    // Verify absent on server
    await expect.poll(async () => {
      const latestTasks = await getTasks();
      return !latestTasks.some((t) => t.id === discoveredHttpId);
    }, { message: 'Failed to verify HTTP task server deletion', timeout: 10000 }).toBe(true);
    
    resourceRegistry.markDeleted(discoveredHttpId!);

    // 2. Magnet Task (Random valid BTIH)
    currentTasks = await getTasks();
    preTaskIds = new Set(currentTasks.map((t) => t.id));
    
    const randomHex = crypto.randomBytes(20).toString('hex');
    const magnetTitle = `r22e-e2e-magnet-${uniqueNonce}`;
    const magnetUri = `magnet:?xt=urn:btih:${randomHex}&dn=${magnetTitle}`;
    
    await page.getByRole('button', { name: /Add Task/i }).click();
    await page.getByLabel(/URL/i).fill(magnetUri);
    if (config.destination) {
      await page.getByLabel(/Destination/i).fill(config.destination);
    }
    await page.getByRole('button', { name: 'Add' }).click();

    let discoveredMagnetId: string | null = null;
    await expect.poll(async () => {
      const latestTasks = await getTasks();
      const exactMatches = latestTasks.filter((t) => t.additional?.detail?.uri === magnetUri && !preTaskIds.has(t.id));
      if (exactMatches.length > 1) {
         throw new Error(`Ambiguous task discovery: found ${exactMatches.length} tasks matching magnet ${magnetUri}`);
      }
      if (exactMatches.length === 1) {
        discoveredMagnetId = exactMatches[0]!.id;
        return true;
      }
      return false;
    }, { message: 'Failed to discover unique Magnet task by URI', timeout: 15000 }).toBe(true);

    expect(discoveredMagnetId).toBeTruthy();
    resourceRegistry.add({ id: discoveredMagnetId!, kind: 'magnet', uri: magnetUri, destination: config.destination });

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
