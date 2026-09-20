import { test, expect } from './fixtures/extension';
import { SynoHttpClient } from '../../src/core/synology/transport/http-client';
import { DiscoveryClient } from '../../src/core/synology/api-discovery/discovery-client';
import { AuthClient } from '../../src/core/synology/auth/auth-client';
import { normalizeNasUrl } from '../../src/core/domain/connection/nas-url';

interface FileStationShare {
  path: string;
  name: string;
  isdir: boolean;
}

interface FileStationListResponse {
  shares?: FileStationShare[];
}

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

    const authClient = new AuthClient(httpClient);
    const loginResult = await authClient.login(nasUrl, registry, username, password, { format: 'sid' });
    expect(loginResult.sid, 'Login must yield a valid SID (2FA is unsupported for automated teardown bypass)').toBeDefined();
    
    expect(registry.isAvailable('SYNO.FileStation.List'), 'FileStation List API must be available to test destination').toBe(true);

    const endpoint = registry.resolveEndpoint('SYNO.FileStation.List');
    const version = registry.getNegotiatedVersion('SYNO.FileStation.List', 1);
    const fsRes = await httpClient.get<FileStationListResponse>(nasUrl, endpoint, { 
      params: {
        api: 'SYNO.FileStation.List',
        version: version.toString(),
        method: 'list_share'
      }, 
      sid: loginResult.sid 
    });
    
    expect(fsRes, 'File station listing must succeed').toBeDefined();
    
    const shares = fsRes.shares || [];
    const destPath = destination as string;
    
    // Validate the destination is inside one of the shares the user can read
    const hasDest = shares.some((s) => destPath === s.path || destPath.startsWith(s.path + '/'));
    expect(hasDest, `Destination "${destPath}" must exist within accessible shared folders`).toBe(true);
    
    console.log(`[Preflight] NAS ${nasUrl} verified. Read-only check passed. Destination [${destPath}] accepted.`);
  });
});
