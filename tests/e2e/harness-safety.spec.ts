import { test, expect } from '@playwright/test';
import { MockNasServer } from './fixtures/mock-server';

test.describe('Real NAS Cleanup Harness Verification', () => {
  let mockServer: MockNasServer;
  let serverUrl: string;

  test.beforeAll(async () => {
    mockServer = new MockNasServer();
    await mockServer.start();
    serverUrl = `http://127.0.0.1:${(mockServer as any).port}`;
  });

  test.afterAll(async () => {
    await mockServer.stop();
  });

  test.beforeEach(() => {
    mockServer.state.authStatus = 'SUCCESS';
    mockServer.state.tasks = [];
  });

  // Extract the exact cleanup logic into a helper we can test
  async function runCleanup(trackedIds: Set<string>, username = 'admin', password = 'password', fakeActiveSid?: string) {
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
    
    const taskIds = Array.from(trackedIds).join(',');
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

    const remainingIds = new Set(listJson.data.tasks.map((t: any) => t.id));
    const leakedIds = Array.from(trackedIds).filter(id => remainingIds.has(id));

    if (leakedIds.length > 0) {
      throw new Error(`Task deletion verified failed! Leaked task IDs remaining on NAS: ${leakedIds.join(', ')}`);
    }
    
    trackedIds.clear();
  }

  test('verifies cleanup logic only deletes tracked IDs and handles already-absent', async () => {
    mockServer.state.tasks = [
      { id: 'dbid_1', title: 'User Data 1' },
      { id: 'dbid_2', title: 'User Data 2' },
      { id: 'dbid_test_1', title: 'Test Task 1' },
    ];
    
    // Notice dbid_test_2 is already absent
    const createdTaskIds = new Set(['dbid_test_1', 'dbid_test_2']);
    
    await runCleanup(createdTaskIds);

    // Verify the mock server state
    expect(mockServer.state.tasks.length).toBe(2);
    expect(mockServer.state.tasks[0].id).toBe('dbid_1');
    expect(mockServer.state.tasks[1].id).toBe('dbid_2');
    
    expect(createdTaskIds.size).toBe(0);
    
    // Duplicate cleanup remains safe
    await runCleanup(new Set(['dbid_test_1']));
    expect(mockServer.state.tasks.length).toBe(2);
  });
  
  test('cleanup authentication failure causes failure without leaking credentials', async () => {
    mockServer.state.authStatus = 'INVALID_CREDENTIALS';
    
    const createdTaskIds = new Set(['dbid_test_1']);
    
    let caughtError: Error | null = null;
    try {
      await runCleanup(createdTaskIds, 'admin', 'super_secret_password');
    } catch (e: any) {
      caughtError = e;
    }
    
    expect(caughtError).not.toBeNull();
    const msg = caughtError!.message;
    expect(msg).toContain('Fallback authentication failed');
    expect(msg).not.toContain('super_secret_password');
    expect(msg).not.toContain('admin');
  });

  test('a task that remains after delete causes failure', async () => {
    mockServer.state.tasks = [
      { id: 'dbid_test_1', title: 'Test Task 1' },
    ];
    
    // Override the mock server delete to be a no-op but return success
    const originalTasks = [...mockServer.state.tasks];
    // A temporary sabotage to mock server state to prevent deletion
    Object.defineProperty(mockServer.state, 'tasks', {
      get: () => originalTasks,
      set: () => { /* no-op */ },
      configurable: true
    });

    const createdTaskIds = new Set(['dbid_test_1']);
    
    let caughtError: Error | null = null;
    try {
      await runCleanup(createdTaskIds);
    } catch (e: any) {
      caughtError = e;
    }
    
    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toContain('Leaked task IDs remaining on NAS: dbid_test_1');
    
    // Restore proper property
    Object.defineProperty(mockServer.state, 'tasks', { value: originalTasks, writable: true, configurable: true });
  });
});
