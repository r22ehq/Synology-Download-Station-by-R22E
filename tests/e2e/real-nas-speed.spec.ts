import { test, expect } from './fixtures/extension';
import { SynoHttpClient } from '../../src/core/synology/transport/http-client';
import { DiscoveryClient } from '../../src/core/synology/api-discovery/discovery-client';
import { AuthClient } from '../../src/core/synology/auth/auth-client';
import { TaskClient } from '../../src/core/synology/download-station/task-client';
import { StatisticClient } from '../../src/core/synology/download-station/statistic-client';
import { loadRealNasTestConfig } from './fixtures/real-nas-config';

test.describe('Real NAS live transfer speed', () => {
  test.skip(!process.env.R22E_TEST_NAS_URL, 'Real NAS configuration is not available.');
  test.skip(process.env.R22E_TEST_ALLOW_MUTATIONS !== 'YES', 'Controlled NAS mutations are not enabled.');

  test('reports live speed for a uniquely tracked temporary download', async ({ page, gotoPopup }) => {
    test.setTimeout(90_000);
    const config = loadRealNasTestConfig();
    expect(config).toBeTruthy();
    if (!config) return;

    const http = new SynoHttpClient();
    const discovery = new DiscoveryClient(http);
    const auth = new AuthClient(http);
    const tasks = new TaskClient(http);
    const statistics = new StatisticClient(http);
    const registry = await discovery.discoverApis(config.nasUrl);
    const { sid } = await auth.login(config.nasUrl, registry, config.username, config.password, { format: 'sid' });
    const nonce = Math.random().toString(36).slice(2, 10);
    const uri = `http://speedtest.tele2.net/100MB.zip?r22e-speed=${nonce}`;
    const before = await tasks.list(config.nasUrl, registry, sid);
    const beforeIds = new Set(before.tasks.map(task => task.id));
    const baseline = await statistics.getInfo(config.nasUrl, registry, sid);
    let createdId: string | null = null;

    try {
      await gotoPopup(page);
      await page.getByText('Add NAS').click();
      await page.getByLabel(/NAS URL/i).fill(config.nasUrl);
      await page.getByLabel(/Username/i).fill(config.username);
      await page.getByRole('button', { name: 'Save Profile' }).click();
      await page.evaluate(async destination => {
        const extensionApi = (globalThis as unknown as {
          chrome: { storage: { local: {
            get: (key: string) => Promise<Record<string, unknown>>;
            set: (items: Record<string, unknown>) => Promise<void>;
          } } };
        }).chrome;
        const result = await extensionApi.storage.local.get('local:profiles');
        const profiles = (result['local:profiles'] || []) as Array<Record<string, unknown>>;
        if (profiles[0]) {
          profiles[0].defaultDestination = destination;
          await extensionApi.storage.local.set({ 'local:profiles': profiles });
        }
      }, config.destination);
      await gotoPopup(page);
      await page.getByPlaceholder('Password').fill(config.password);
      await page.getByRole('button', { name: 'Login' }).click();
      await page.getByPlaceholder(/Paste URL/i).fill(uri);
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await expect.poll(async () => {
        const current = await tasks.list(config.nasUrl, registry, sid, { additional: ['detail', 'transfer'] });
        const match = current.tasks.find(task => !beforeIds.has(task.id) && task.additional?.detail?.uri === uri);
        createdId = match?.id || null;
        return Boolean(createdId);
      }, { timeout: 20_000, message: 'Temporary speed-test task was not uniquely discovered.' }).toBe(true);

      await expect.poll(async () => {
        const aggregate = await statistics.getInfo(config.nasUrl, registry, sid);
        const current = await tasks.list(config.nasUrl, registry, sid, { additional: ['transfer'] });
        const task = current.tasks.find(item => item.id === createdId);
        return aggregate.speed_download > baseline.speed_download || (task?.additional?.transfer?.speed_download || 0) > 0;
      }, { timeout: 45_000, intervals: [1000, 1500, 2500], message: 'No live download speed was observed.' }).toBe(true);
    } finally {
      if (createdId) {
        await tasks.delete(config.nasUrl, registry, sid, [createdId], false);
        await expect.poll(async () => {
          const current = await tasks.list(config.nasUrl, registry, sid);
          return !current.tasks.some(task => task.id === createdId);
        }, { timeout: 20_000, message: 'Temporary speed-test task cleanup was not confirmed.' }).toBe(true);
      }
    }
  });
});
