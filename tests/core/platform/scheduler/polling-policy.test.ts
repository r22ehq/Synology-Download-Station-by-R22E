import { describe, expect, it } from 'vitest';
import { hasOngoingTasks, liveRefreshInterval, shouldBackgroundPoll } from '../../../../src/core/platform/scheduler/polling-policy';
import type { DownloadTask } from '../../../../src/core/synology/download-station/types';

const task = (status: DownloadTask['status']) => ({ status }) as DownloadTask;

describe('polling policy', () => {
  it('polls in background only while a task can progress', () => {
    expect(hasOngoingTasks([])).toBe(false);
    expect(hasOngoingTasks([task('finished'), task('paused')])).toBe(false);
    expect(hasOngoingTasks([task('finished'), task('waiting')])).toBe(true);
  });

  it('relaxes live polling when idle while respecting slower user choices', () => {
    expect(liveRefreshInterval(3000, true)).toBe(3000);
    expect(liveRefreshInterval(3000, false)).toBe(15000);
    expect(liveRefreshInterval(30000, false)).toBe(30000);
  });

  it('respects the background switch without changing existing defaults', () => {
    expect(shouldBackgroundPoll(true, true)).toBe(true);
    expect(shouldBackgroundPoll(true, undefined)).toBe(true);
    expect(shouldBackgroundPoll(true, false)).toBe(false);
    expect(shouldBackgroundPoll(false, true)).toBe(false);
  });
});
