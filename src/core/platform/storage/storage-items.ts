/**
 * Typed storage item definitions.
 *
 * These use WXT's storage.defineItem API which provides:
 * - Type-safe get/set
 * - Default values
 * - Cross-context reactivity (watch)
 * - Storage area prefixes (local:, session:, sync:)
 *
 * Import path 'wxt/storage' is resolved by WXT during build.
 */
import { storage } from 'wxt/utils/storage';

export interface NasProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  username: string;
  defaultDestination?: string;
}

export interface AppSettings {
  pollingInterval: number;
  badgeMode: 'none' | 'active' | 'downloading' | 'failed';
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  contextMenuEnabled: boolean;
  downloadInterceptionEnabled: boolean;
}

export interface TaskCacheEntry {
  id: string;
  title: string;
  status: string;
  size: number;
  sizeDownloaded: number;
  speedDownload: number;
  speedUpload: number;
}

export interface SessionData {
  sid: string;
  synoToken?: string;
}

export interface NotificationState {
  /** Task IDs that have already triggered a completion notification. */
  notifiedTaskIds: string[];
}

export const profilesStorage = storage.defineItem<NasProfile[]>('local:profiles', {
  defaultValue: [],
});

export const activeProfileIdStorage = storage.defineItem<string | null>('local:activeProfileId', {
  defaultValue: null,
});

export const settingsStorage = storage.defineItem<AppSettings>('local:settings', {
  defaultValue: {
    pollingInterval: 3000,
    badgeMode: 'active',
    theme: 'system',
    notificationsEnabled: true,
    contextMenuEnabled: true,
    downloadInterceptionEnabled: false,
  },
});

export const taskCacheStorage = storage.defineItem<TaskCacheEntry[]>('session:taskCache', {
  defaultValue: [],
});

export const sessionDataStorage = storage.defineItem<Record<string, SessionData>>(
  'session:sessions',
  {
    defaultValue: {},
  },
);

export const recentDestinationsStorage = storage.defineItem<string[]>('local:recentDestinations', {
  defaultValue: [],
});

export const notificationStateStorage = storage.defineItem<NotificationState>(
  'session:notificationState',
  {
    defaultValue: {
      notifiedTaskIds: [],
    },
  },
);

import type { ProfileTaskState } from '../browser/task-tracker';

export const getTrackerStorageItem = (profileId: string) => {
  return storage.defineItem<ProfileTaskState>(`session:taskTracker_${profileId}`, {
    defaultValue: { tasks: {}, authLostNotified: false },
  });
};

export const getAuthDeviceStorageItem = (profileId: string) => {
  return storage.defineItem<string | null>(`local:authDevice_${profileId}`, {
    defaultValue: null,
  });
};

export const removeProfileData = async (profileId: string) => {
  // Remove profile from profilesStorage
  const profiles = await profilesStorage.getValue();
  await profilesStorage.setValue(profiles.filter(p => p.id !== profileId));
  
  // Remove active profile if it was this one
  if (await activeProfileIdStorage.getValue() === profileId) {
    await activeProfileIdStorage.setValue(null);
  }

  // Remove from sessions storage
  const sessions = await sessionDataStorage.getValue();
  if (sessions[profileId]) {
    delete sessions[profileId];
    await sessionDataStorage.setValue(sessions);
  }

  // Remove task tracker storage
  await getTrackerStorageItem(profileId).removeValue();
  
  // Remove auth device token
  await getAuthDeviceStorageItem(profileId).removeValue();
};
