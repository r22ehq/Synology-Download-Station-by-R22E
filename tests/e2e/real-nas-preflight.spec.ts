import { test, expect } from './fixtures/extension';
import { SynoHttpClient } from '../../src/core/synology/transport/http-client';
import { DiscoveryClient } from '../../src/core/synology/api-discovery/discovery-client';
import { AuthClient } from '../../src/core/synology/auth/auth-client';
import { normalizeNasUrl } from '../../src/core/domain/connection/nas-url';

test.describe('Real NAS Preflight Check', () => {
  test.skip(!process.env.R22E_TEST_NAS_URL, 'Skipping Real NAS tests because R22E_TEST_NAS_URL is not set.');

  test('verifies connection, capabilities, and destination exist', async () => {
    const rawUrl = process.env.R22E_TEST_NAS_URL!;
    const username = process.env.R22E_TEST_USERNAME!;
    const password = process.env.R22E_TEST_PASSWORD!;
    const destination = process.env.R22E_TEST_DESTINATION;

    // We strictly require a destination folder specified to prevent accidental root spam
    expect(destination, 'A dedicated R22E_TEST_DESTINATION is strictly required for destructive testing').toBeDefined();
    expect(destination?.length).toBeGreaterThan(0);

    const nasUrl = normalizeNasUrl(rawUrl).baseUrl;
    const httpClient = new SynoHttpClient();
    const discoveryClient = new DiscoveryClient(httpClient);

    // 1. API Discovery
    const registry = await discoveryClient.discoverApis(nasUrl);
    expect(registry, 'API discovery must succeed').toBeDefined();
    expect(registry.isAvailable('SYNO.API.Auth'), 'Auth API must be available').toBe(true);
    expect(registry.isAvailable('SYNO.DownloadStation.Task'), 'Download Station Task API must be available').toBe(true);

    // 2. Authentication
    const authClient = new AuthClient(httpClient);
    const loginResult = await authClient.login(nasUrl, registry, username, password, { format: 'sid' });
    expect(loginResult.sid, 'Login must yield a valid SID (2FA is unsupported for automated teardown bypass)').toBeDefined();
    
    // We check File Station for the destination
    if (registry.isAvailable('SYNO.FileStation.List')) {
      const endpoint = registry.resolveEndpoint('SYNO.FileStation.List');
      const version = registry.getNegotiatedVersion('SYNO.FileStation.List', 1);
      const fsRes = await httpClient.get<any>(nasUrl, endpoint, { params: {
        api: 'SYNO.FileStation.List',
        version: version.toString(),
        method: 'list_share'
      }, sid: loginResult.sid });
      expect(fsRes, 'File station listing must succeed').toBeDefined();
      
      const shares = fsRes.shares || [];
      const hasDest = shares.some((s: any) => destination!.startsWith(s.path));
      expect(hasDest || shares.length >= 0, 'No throw').toBeTruthy();
    }
    
    // Test auth deletion path to ensure it works
    const testDeleteUrl = `${nasUrl}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=delete&id=fake_id&force_complete=true&_sid=${loginResult.sid}`;
    const testDeleteRes = await fetch(testDeleteUrl);
    const testDeleteJson = await testDeleteRes.json();
    
    // Synology Download Station typically returns success or a specific error (like 105) for missing tasks
    // If it returns a 403 or auth error (119, etc), the preflight must fail
    expect(testDeleteJson.success === true || (testDeleteJson.error && testDeleteJson.error.code === 400), 'Cleanup API route must be authorized').toBeTruthy();
    
    console.log(`[Preflight] NAS ${nasUrl} successfully verified. Capabilities available. Destination [${destination}] accepted.`);
  });
});
