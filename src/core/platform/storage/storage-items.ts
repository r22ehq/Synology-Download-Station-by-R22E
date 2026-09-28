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
import type { DownloadTask } from '@/core/synology/download-station/types';
import type { CompletionSoundId } from '../browser/completion-sounds';

export interface NasProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  username: string;
  quickConnectId?: string;
  defaultDestination?: string;
}

export interface ThemePalette {
  accent: string;
  background: string;
  surface: string;
  foreground: string;
  secondaryText: string;
  border: string;
}

export interface AppSettings {
  pollingInterval: number;
  backgroundPollingEnabled: boolean;
  badgeMode: 'none' | 'active' | 'downloading' | 'failed';
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  completionSoundEnabled: boolean;
  completionSound: CompletionSoundId;
  contextMenuEnabled?: boolean;
  contextMenuDownloadEnabled: boolean;
  contextMenuScrapeEnabled: boolean;
  downloadInterceptionEnabled: boolean;
  lightPreset: string;
  darkPreset: string;
  lightPalette: ThemePalette;
  darkPalette: ThemePalette;
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

export interface TaskSnapshot {
  profileId: string | null;
  tasks: DownloadTask[];
  stats: {
    speedDownload: number;
    speedUpload: number;
  };
  updatedAt: number;
  error?: string;
}

export interface ScrapeResource {
  id: string;
  url: string;
  kind: 'link' | 'magnet' | 'torrent' | 'image' | 'video' | 'audio';
  label: string;
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
    backgroundPollingEnabled: true,
    badgeMode: 'active',
    theme: 'system',
    notificationsEnabled: true,
    completionSoundEnabled: true,
    completionSound: 'soft',
    contextMenuDownloadEnabled: true,
    contextMenuScrapeEnabled: true,
    downloadInterceptionEnabled: false,
    lightPreset: 'frost',
    darkPreset: 'midnight',
    lightPalette: {
      accent: '#1761ed',
      background: '#eef1f5',
      surface: '#ffffff',
      foreground: '#172033',
      secondaryText: '#657084',
      border: '#dfe4eb',
    },
    darkPalette: {
      accent: '#3d85ff',
      background: '#111318',
      surface: '#1a1d23',
      foreground: '#f2f4f7',
      secondaryText: '#9098a5',
      border: '#2c323c',
    },
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

export const taskSnapshotStorage = storage.defineItem<TaskSnapshot>('session:taskSnapshot', {
  defaultValue: {
    profileId: null,
    tasks: [],
    stats: { speedDownload: 0, speedUpload: 0 },
    updatedAt: 0,
  },
});

export const scrapeResultsStorage = storage.defineItem<ScrapeResource[]>('session:scrapeResults', {
  defaultValue: [],
});

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

/** Opt-in credentials and remembered sessions never use sync storage or settings backup. */
export const getSavedPasswordStorageItem = (profileId: string) => storage.defineItem<string | null>(
  `local:savedPassword_${profileId}`,
  { defaultValue: null },
);

export const getRememberedSessionStorageItem = (profileId: string) => storage.defineItem<SessionData | null>(
  `local:rememberedSession_${profileId}`,
  { defaultValue: null },
);

export const getAutoLoginSuppressedStorageItem = (profileId: string) => storage.defineItem<boolean>(
  `local:autoLoginSuppressed_${profileId}`,
  { defaultValue: false },
);

export const removeProfileData = async (profileId: string) => {
  // Remove profile from profilesStorage
  const profiles = await profilesStorage.getValue();
  await profilesStorage.setValue(profiles.filter(p => p.id !== profileId));
  
  // Remove active profile if it was this one
  if (await activeProfileIdStorage.getValue() === profileId) {
    await activeProfileIdStorage.setValue(null);
  }

  // Remove from sessions storage
  const sessions = { ...(await sessionDataStorage.getValue()) };
  if (sessions[profileId]) {
    delete sessions[profileId];
    await sessionDataStorage.setValue(sessions);
  }

  // Remove task tracker storage
  await getTrackerStorageItem(profileId).removeValue();
  
  // Remove auth device token
  await getAuthDeviceStorageItem(profileId).removeValue();
  await getSavedPasswordStorageItem(profileId).removeValue();
  await getRememberedSessionStorageItem(profileId).removeValue();
  await getAutoLoginSuppressedStorageItem(profileId).removeValue();

  const snapshot = await taskSnapshotStorage.getValue();
  if (snapshot.profileId === profileId) {
    await taskSnapshotStorage.setValue({
      profileId: null,
      tasks: [],
      stats: { speedDownload: 0, speedUpload: 0 },
      updatedAt: Date.now(),
    });
  }
};
