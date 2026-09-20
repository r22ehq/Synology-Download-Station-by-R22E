import type { DownloadTask } from '../../synology/download-station/types';
import { notifications } from './notifications';

export type TaskStatus = DownloadTask['status'];

export interface ProfileTaskState {
  tasks: Record<string, TaskStatus>;
  authLostNotified?: boolean;
  initialized?: boolean;
}

import { getTrackerStorageItem } from '../storage/storage-items';

export class TaskTracker {
  private updateLocks = new Map<string, Promise<void>>();

  public async updateTasks(profileId: string, currentTasks: DownloadTask[]): Promise<void> {
    // Concurrency serialization
    const lock = this.updateLocks.get(profileId) || Promise.resolve();
    const nextLock = lock.then(() => this._doUpdateTasks(profileId, currentTasks)).catch(() => {});
    this.updateLocks.set(profileId, nextLock);
    return nextLock;
  }

  private async _doUpdateTasks(profileId: string, currentTasks: DownloadTask[]): Promise<void> {
    const item = getTrackerStorageItem(profileId);
    const state = await item.getValue();
    
    // If successfully polling, reset auth lost notification flag
    if (state.authLostNotified) {
      state.authLostNotified = false;
    }

    const isColdStart = !state.initialized;
    const newTasksState: Record<string, TaskStatus> = {};
    let hasChanges = false;

    for (const task of currentTasks) {
      newTasksState[task.id] = task.status;

      if (!isColdStart) {
        const prevStatus = state.tasks[task.id];
        if (prevStatus && prevStatus !== task.status) {
          if (task.status === 'finished') {
            await notifications.show(`task-${profileId}-${task.id}-done`, 'Task Completed', `${task.title} has finished downloading.`);
          } else if (task.status === 'error') {
            await notifications.show(`task-${profileId}-${task.id}-error`, 'Task Failed', `${task.title} encountered an error.`);
          }
        }
      }
    }

    // Determine if we need to save
    const prevKeys = Object.keys(state.tasks);
    const newKeys = Object.keys(newTasksState);
    if (prevKeys.length !== newKeys.length) {
      hasChanges = true;
    } else {
      for (const key of newKeys) {
        if (state.tasks[key] !== newTasksState[key]) {
          hasChanges = true;
          break;
        }
      }
    }

    if (hasChanges || isColdStart || state.authLostNotified !== (await item.getValue()).authLostNotified) {
      state.tasks = newTasksState;
      state.initialized = true;
      await item.setValue(state);
    }
  }

  public async notifyAuthLost(profileId: string) {
    const item = getTrackerStorageItem(profileId);
    const state = await item.getValue();
    
    if (!state.authLostNotified) {
      await notifications.show(`auth-lost-${profileId}`, 'Authentication Lost', 'Your session with Synology NAS has expired.');
      state.authLostNotified = true;
      await item.setValue(state);
    }
  }
}

export const taskTracker = new TaskTracker();
