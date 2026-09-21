import { test, expect } from './fixtures/extension';
import { SynoHttpClient } from '../../src/core/synology/transport/http-client';
import { DiscoveryClient } from '../../src/core/synology/api-discovery/discovery-client';
import { AuthClient } from '../../src/core/synology/auth/auth-client';
import { TaskClient } from '../../src/core/synology/download-station/task-client';
import { StatisticClient } from '../../src/core/synology/download-station/statistic-client';
import { FileStationClient } from '../../src/core/synology/file-station/file-station-client';
import { loadRealNasTestConfig } from './fixtures/real-nas-config';

test.describe('Real NAS Preflight Check', () => {
  test.skip(!process.env.R22E_TEST_NAS_URL, 'Skipping Real NAS tests because R22E_TEST_NAS_URL is not set.');

  test('verifies connection, capabilities, and destination exist (read-only)', async () => {
    const config = loadRealNasTestConfig();
    expect(config, 'Config must be loaded since we did not skip').toBeDefined();
    if (!config) return;

    const { nasUrl, username, password, destination } = config;

    const httpClient = new SynoHttpClient();
    const discoveryClient = new DiscoveryClient(httpClient);
    const taskClient = new TaskClient(httpClient);
    const statClient = new StatisticClient(httpClient);
    const fsClient = new FileStationClient(httpClient);

    const registry = await discoveryClient.discoverApis(nasUrl);
    expect(registry, 'API discovery must succeed').toBeDefined();
    expect(registry.isAvailable('SYNO.API.Auth'), 'Auth API must be available').toBe(true);
    expect(registry.isAvailable('SYNO.DownloadStation.Task'), 'Download Station Task API must be available').toBe(true);
    expect(registry.isAvailable('SYNO.DownloadStation.Statistic'), 'Download Station Statistic API must be available').toBe(true);

    const authClient = new AuthClient(httpClient);
    const loginResult = await authClient.login(nasUrl, registry, username, password, { format: 'sid' });
    expect(loginResult.sid, 'Login must yield a valid SID (2FA is unsupported for automated destructive test accounts)').toBeDefined();
    
    // Validate we actually have Download Station access
    const listRes = await taskClient.list(nasUrl, registry, loginResult.sid);
    expect(listRes.tasks, 'Download Station Task list must return a tasks array').toBeDefined();
    
    const statRes = await statClient.getInfo(nasUrl, registry, loginResult.sid);
    expect(typeof statRes.speed_download, 'Download Station Statistic info must yield expected data').toBe('number');

    expect(registry.isAvailable('SYNO.FileStation.List'), 'FileStation List API must be available to test destination').toBe(true);
    
    // Ensure the folder exactly exists
    const destPath = destination;
    const fsListFolderRes = await fsClient.listFolder(nasUrl, registry, loginResult.sid, destPath);
    
    expect(fsListFolderRes.files, `Destination "${destPath}" must return its contents list`).toBeDefined();
    
    console.log(`[Preflight] NAS connection verified. Dedicated test destination is accessible.`);
  });
});
