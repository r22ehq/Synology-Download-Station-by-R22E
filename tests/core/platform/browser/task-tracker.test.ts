import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DownloadTask } from '../../../../src/core/synology/download-station/types';

const store: Record<string, any> = {};

vi.mock('../../../../src/core/platform/storage/storage-items', () => {
  return {
    getTrackerStorageItem: vi.fn((profileId: string) => ({
      getValue: vi.fn().mockImplementation(async () => {
        const key = `session:taskTracker_${profileId}`;
        return store[key] !== undefined ? JSON.parse(JSON.stringify(store[key])) : { tasks: {}, authLostNotified: false };
      }),
      setValue: vi.fn().mockImplementation(async (val: any) => {
        const key = `session:taskTracker_${profileId}`;
        store[key] = JSON.parse(JSON.stringify(val));
      }),
    })),
  };
});

vi.mock('../../../../src/core/platform/browser/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

import { TaskTracker } from '../../../../src/core/platform/browser/task-tracker';
import { notifications } from '../../../../src/core/platform/browser/notifications';

describe('TaskTracker', () => {
  let tracker: TaskTracker;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(store)) delete store[k];
    tracker = new TaskTracker();
  });

  const makeTask = (id: string, status: DownloadTask['status']): DownloadTask => ({
    id, status, title: `Task ${id}`, type: 'http', size: 100, current_rate: 0, current_size: 0, 
    progress: 0, extra: {}, username: 'admin'
  } as DownloadTask);

  it('should not notify on cold start with active or finished tasks', async () => {
    // Uninitialized state (cold start)
    await tracker.updateTasks('profile-1', [
      makeTask('task-1', 'downloading'),
      makeTask('task-2', 'finished')
    ]);
    expect(notifications.show).not.toHaveBeenCalled();

    // Subsequent transition triggers notification
    await tracker.updateTasks('profile-1', [
      makeTask('task-1', 'finished'),
      makeTask('task-2', 'finished')
    ]);
    expect(notifications.show).toHaveBeenCalledTimes(1);
    expect(notifications.show).toHaveBeenCalledWith('task-profile-1-task-1-done', 'Task Completed', 'Task task-1 has finished downloading.');
  });

  it('should handle concurrent updates safely', async () => {
    // Cold start baseline
    await tracker.updateTasks('profile-1', [makeTask('task-1', 'downloading')]);
    
    // Simulate rapid concurrent updates for the same transition
    const p1 = tracker.updateTasks('profile-1', [makeTask('task-1', 'finished')]);
    const p2 = tracker.updateTasks('profile-1', [makeTask('task-1', 'finished')]);
    const p3 = tracker.updateTasks('profile-1', [makeTask('task-1', 'finished')]);

    await Promise.all([p1, p2, p3]);

    // Should only notify ONCE
    expect(notifications.show).toHaveBeenCalledTimes(1);
  });

  it('should isolate states between profiles', async () => {
    // Both profiles have a task with id task-1
    await tracker.updateTasks('profile-1', [makeTask('task-1', 'downloading')]);
    await tracker.updateTasks('profile-2', [makeTask('task-1', 'finished')]); // Should not notify, no prev state in profile-2
    expect(notifications.show).not.toHaveBeenCalled();

    await tracker.updateTasks('profile-1', [makeTask('task-1', 'finished')]);
    expect(notifications.show).toHaveBeenCalledTimes(1);
    expect(notifications.show).toHaveBeenCalledWith('task-profile-1-task-1-done', expect.any(String), expect.any(String));
  });

  it('should notify auth lost only once', async () => {
    await tracker.notifyAuthLost('profile-1');
    expect(notifications.show).toHaveBeenCalledTimes(1);

    await tracker.notifyAuthLost('profile-1');
    expect(notifications.show).toHaveBeenCalledTimes(1); // Still 1

    // Update tasks resets auth lost
    await tracker.updateTasks('profile-1', []);
    
    await tracker.notifyAuthLost('profile-1');
    expect(notifications.show).toHaveBeenCalledTimes(2); // Notified again
  });
});
