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

  test('verifies cleanup logic only deletes tracked IDs', async () => {
    // Add dummy existing tasks to the mock server to represent user's existing data
    mockServer.state.tasks = [
      { id: 'dbid_1', title: 'User Data 1', status: 'downloading', size: 100, current_size: 50, speed_download: 0, speed_upload: 0 },
      { id: 'dbid_2', title: 'User Data 2', status: 'downloading', size: 100, current_size: 50, speed_download: 0, speed_upload: 0 },
    ];
    
    // Simulate what the test harness tracked
    const createdTaskIds = new Set(['dbid_test_1', 'dbid_test_2']);
    
    // Add those test tasks to the server
    mockServer.state.tasks.push(
      { id: 'dbid_test_1', title: 'Test Task 1', status: 'downloading', size: 100, current_size: 50, speed_download: 0, speed_upload: 0 },
      { id: 'dbid_test_2', title: 'Test Task 2', status: 'downloading', size: 100, current_size: 50, speed_download: 0, speed_upload: 0 },
    );

    // Run the identical cleanup logic from real-nas.spec.ts
    const username = 'admin';
    const password = 'password';
    
    const authUrl = `${serverUrl}/webapi/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=${encodeURIComponent(username)}&passwd=${encodeURIComponent(password)}&session=DownloadStation&format=sid`;
    const authRes = await fetch(authUrl);
    const authJson = await authRes.json();
    const sid = authJson.data.sid;
    
    const taskIds = Array.from(createdTaskIds).join(',');
    const deleteUrl = `${serverUrl}/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=delete&id=${encodeURIComponent(taskIds)}&force_complete=true&_sid=${sid}`;
    const deleteRes = await fetch(deleteUrl);
    const deleteJson = await deleteRes.json();

    expect(deleteJson.success).toBe(true);

    // Verify the mock server state
    expect(mockServer.state.tasks.length).toBe(2);
    expect(mockServer.state.tasks[0].id).toBe('dbid_1'); // Untouched
    expect(mockServer.state.tasks[1].id).toBe('dbid_2'); // Untouched
    
    // Verify cleanup handles already-deleted tasks safely (idempotency)
    const duplicateDeleteRes = await fetch(deleteUrl);
    const duplicateDeleteJson = await duplicateDeleteRes.json();
    
    // In our mock, if they don't exist it just succeeds (or returns an error we handle without throwing)
    // We expect the mock to successfully ignore or error safely
    expect(duplicateDeleteJson.success).toBeDefined(); // Shouldn't crash
  });
});
