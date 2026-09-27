import type { DownloadTask } from '@/core/synology/download-station/types';

const trackedStatuses = new Set<DownloadTask['status']>(['waiting', 'downloading', 'extracting', 'hash_checking']);

export const hasOngoingTasks = (tasks: DownloadTask[]) => tasks.some(task => trackedStatuses.has(task.status));

/** Existing settings may predate the toggle, so absence preserves prior behavior. */
export const shouldBackgroundPoll = (hasActiveDownloads: boolean, enabled?: boolean) =>
  hasActiveDownloads && enabled !== false;

/** Fast while transfers are underway, relaxed while a view is open but idle. */
export const liveRefreshInterval = (requestedMs: number, active: boolean) =>
  Math.max(active ? 3000 : 15000, requestedMs);
