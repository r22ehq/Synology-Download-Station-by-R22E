import { test, expect } from '@playwright/test';
import { MockNasServer } from './fixtures/mock-server';
import { TestResourceRegistry } from './fixtures/test-registry';

test.describe('Real NAS Cleanup Harness Verification', () => {
  let mockServer: MockNasServer;
  let serverUrl: string;

  test.beforeAll(async () => {
    mockServer = new MockNasServer();
    await mockServer.start();
    serverUrl = mockServer.getUrl();
  });

  test.afterAll(async () => {
    await mockServer.stop();
  });

  test.beforeEach(() => {
    mockServer.reset();
  });

  // Extract the exact cleanup logic into a helper we can test
  async function runCleanup(registry: TestResourceRegistry, username = 'admin', password = 'password', fakeActiveSid?: string) {
    const pending = registry.getPendingDeletions();
    if (pending.length === 0) return;

    let sid = fakeActiveSid;
    if (!sid) {
      const authUrl = `${serverUrl}/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${encodeURIComponent(username)}&passwd=${encodeURIComponent(password)}&session=DownloadStation&format=sid`;
      const authRes = await fetch(authUrl);
      const authJson = await authRes.json();
      
      if (!authJson.success || !authJson.data?.sid) {
        throw new Error('Fallback authentication failed (possibly due to 2FA).');
      }
      sid = authJson.data.sid;
    }
    
    const taskIds = pending.map(t => t.id).join(',');
    const deleteUrl = `${serverUrl}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=delete&id=${encodeURIComponent(taskIds)}&force_complete=true&_sid=${sid}`;
    const deleteRes = await fetch(deleteUrl);
    const deleteJson = await deleteRes.json();

    if (!deleteJson.success) {
      throw new Error(`API delete command failed with code ${deleteJson.error?.code}`);
    }

    const listUrl = `${serverUrl}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=list&_sid=${sid}`;
    const listRes = await fetch(listUrl);
    const listJson = await listRes.json();

    if (!listJson.success) {
      throw new Error(`Failed to list tasks for cleanup verification, code: ${listJson.error?.code}`);
    }

    const remainingIds = new Set(listJson.data.tasks.map((t: { id: string }) => t.id));
    const leakedIds = pending.map(t => t.id).filter(id => remainingIds.has(id));

    if (leakedIds.length > 0) {
      throw new Error(`Task deletion verified failed! Leaked task IDs remaining on NAS: ${leakedIds.join(', ')}`);
    }
    
    pending.forEach(t => registry.markDeleted(t.id));
  }

  test('verifies cleanup logic only deletes tracked IDs and handles already-absent', async () => {
    mockServer.state.tasks = [
      { id: 'dbid_1', title: 'User Data 1', status: 'downloading' },
      { id: 'dbid_2', title: 'User Data 2', status: 'downloading' },
      { id: 'dbid_test_1', title: 'Test Task 1', status: 'downloading' },
    ];
    
    const registry = new TestResourceRegistry();
    registry.add({ id: 'dbid_test_1', kind: 'http', uri: 'http://test', destination: '' });
    // Notice dbid_test_2 is already absent from server
    registry.add({ id: 'dbid_test_2', kind: 'magnet', uri: 'magnet:?test', destination: '' });
    
    await runCleanup(registry);

    // Verify the mock server state
    expect(mockServer.state.tasks.length).toBe(2);
    expect(mockServer.state.tasks[0]!.id).toBe('dbid_1');
    expect(mockServer.state.tasks[1]!.id).toBe('dbid_2');
    
    expect(registry.getPendingDeletions().length).toBe(0);
    
    // Duplicate cleanup remains safe
    registry.add({ id: 'dbid_test_1', kind: 'http', uri: 'http://test', destination: '' });
    await runCleanup(registry);
    expect(mockServer.state.tasks.length).toBe(2);
  });
  
  test('cleanup authentication failure causes failure without leaking credentials', async () => {
    mockServer.state.authStatus = 'INVALID_CREDENTIALS';
    
    const registry = new TestResourceRegistry();
    registry.add({ id: 'dbid_test_1', kind: 'http', uri: 'http://test', destination: '' });
    
    let caughtError: Error | undefined;
    try {
      await runCleanup(registry, 'admin', 'super_secret_password');
    } catch (e: unknown) {
      caughtError = e instanceof Error ? e : new Error(String(e));
    }
    
    expect(caughtError).toBeDefined();
    const msg = caughtError!.message;
    expect(msg).toContain('Fallback authentication failed');
    expect(msg).not.toContain('super_secret_password');
    expect(msg).not.toContain('admin');
  });

  test('a task that remains after delete causes failure', async () => {
    mockServer.state.tasks = [
      { id: 'dbid_test_1', title: 'Test Task 1', status: 'downloading' },
    ];
    
    const originalTasks = [...mockServer.state.tasks];
    Object.defineProperty(mockServer.state, 'tasks', {
      get: () => originalTasks,
      set: () => { /* no-op */ },
      configurable: true
    });

    const registry = new TestResourceRegistry();
    registry.add({ id: 'dbid_test_1', kind: 'http', uri: 'http://test', destination: '' });
    
    let caughtError: Error | undefined;
    try {
      await runCleanup(registry);
    } catch (e: unknown) {
      caughtError = e instanceof Error ? e : new Error(String(e));
    }
    
    expect(caughtError).toBeDefined();
    expect(caughtError!.message).toContain('Leaked task IDs remaining on NAS: dbid_test_1');
    
    // Restore proper property
    Object.defineProperty(mockServer.state, 'tasks', { value: originalTasks, writable: true, configurable: true });
  });
});
