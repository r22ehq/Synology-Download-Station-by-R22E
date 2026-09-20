import { test, expect } from './fixtures/extension';
import { SynoHttpClient } from '../../src/core/synology/transport/http-client';
import { DiscoveryClient } from '../../src/core/synology/api-discovery/discovery-client';
import { AuthClient } from '../../src/core/synology/auth/auth-client';
import { normalizeNasUrl } from '../../src/core/domain/connection/nas-url';
import type { FileStationListResponse, TaskListApiResponse, EmptySuccessResponse } from './fixtures/synology-types';

test.describe('Real NAS Preflight Check', () => {
  test.skip(!process.env.R22E_TEST_NAS_URL, 'Skipping Real NAS tests because R22E_TEST_NAS_URL is not set.');

  test('verifies connection, capabilities, and destination exist (read-only)', async () => {
    const rawUrl = process.env.R22E_TEST_NAS_URL!;
    const username = process.env.R22E_TEST_USERNAME!;
    const password = process.env.R22E_TEST_PASSWORD!;
    const destination = process.env.R22E_TEST_DESTINATION;

    expect(destination, 'A dedicated R22E_TEST_DESTINATION is strictly required for destructive testing').toBeDefined();
    expect(destination?.length).toBeGreaterThan(0);

    const nasUrl = normalizeNasUrl(rawUrl).baseUrl;
    const httpClient = new SynoHttpClient();
    const discoveryClient = new DiscoveryClient(httpClient);

    const registry = await discoveryClient.discoverApis(nasUrl);
    expect(registry, 'API discovery must succeed').toBeDefined();
    expect(registry.isAvailable('SYNO.API.Auth'), 'Auth API must be available').toBe(true);
    expect(registry.isAvailable('SYNO.DownloadStation.Task'), 'Download Station Task API must be available').toBe(true);
    expect(registry.isAvailable('SYNO.DownloadStation.Statistic'), 'Download Station Statistic API must be available').toBe(true);

    const authClient = new AuthClient(httpClient);
    const loginResult = await authClient.login(nasUrl, registry, username, password, { format: 'sid' });
    expect(loginResult.sid, 'Login must yield a valid SID (2FA is unsupported for automated teardown bypass)').toBeDefined();
    
    // Validate we actually have Download Station access
    const taskEndpoint = registry.resolveEndpoint('SYNO.DownloadStation.Task');
    const taskVersion = registry.getNegotiatedVersion('SYNO.DownloadStation.Task', 1);
    const listRes = await httpClient.get<TaskListApiResponse>(nasUrl, taskEndpoint, {
      params: { api: 'SYNO.DownloadStation.Task', version: taskVersion.toString(), method: 'list' },
      sid: loginResult.sid
    });
    expect(listRes.success, 'Download Station Task list must succeed').toBe(true);
    
    const statEndpoint = registry.resolveEndpoint('SYNO.DownloadStation.Statistic');
    const statVersion = registry.getNegotiatedVersion('SYNO.DownloadStation.Statistic', 1);
    const statRes = await httpClient.get<EmptySuccessResponse>(nasUrl, statEndpoint, {
      params: { api: 'SYNO.DownloadStation.Statistic', version: statVersion.toString(), method: 'getinfo' },
      sid: loginResult.sid
    });
    expect(statRes.success, 'Download Station Statistic info must succeed').toBe(true);

    expect(registry.isAvailable('SYNO.FileStation.List'), 'FileStation List API must be available to test destination').toBe(true);
    const fsEndpoint = registry.resolveEndpoint('SYNO.FileStation.List');
    const fsVersion = registry.getNegotiatedVersion('SYNO.FileStation.List', 1);
    
    // Ensure the folder exactly exists
    const destPath = destination as string;
    const fsListFolderRes = await httpClient.get<FileStationListResponse>(nasUrl, fsEndpoint, { 
      params: {
        api: 'SYNO.FileStation.List',
        version: fsVersion.toString(),
        method: 'list',
        folder_path: destPath
      }, 
      sid: loginResult.sid 
    });
    
    expect(fsListFolderRes.success, `Destination "${destPath}" must exist and be accessible`).toBe(true);
    
    console.log(`[Preflight] NAS connection verified. Dedicated test destination is accessible.`);
  });
});
