import { defineExtensionMessaging } from '@webext-core/messaging';

import type { DownloadTask } from '../../synology/download-station/types';
import type { DownloadStationConfig, SpeedLimits } from '../../synology/download-station/types';
export type { DownloadTask };

export interface TaskActionResult {
  id: string;
  success: boolean;
  error?: string;
}

export interface TaskCreateResult {
  input: string;
  success: boolean;
  error?: string;
}

export interface NasConnectionConfig {
  url: string;
  username: string;
  password?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  path: string;
}

export interface Settings {
  pollingInterval: number;
  badgeMode: 'none' | 'speed' | 'count';
  theme: 'light' | 'dark' | 'system';
}

interface ProtocolMap {
  'tasks:list': (data: { additional?: string[] }) => { tasks: DownloadTask[]; total: number; stats: { speedDownload: number; speedUpload: number } };
  'tasks:refresh_intent': (data: Record<string, never>) => { tasks: DownloadTask[]; stats: { speedDownload: number; speedUpload: number } };
  'tasks:create': (request: { uri?: string; uris?: string[]; destination?: string; fileData?: { name: string, type: string, bytes: number[] }; forceDirect?: boolean }) => { success: boolean; results: TaskCreateResult[] };
  'tasks:pause': (request: { ids: string[] }) => { results: TaskActionResult[] };
  'tasks:resume': (request: { ids: string[] }) => { results: TaskActionResult[] };
  'tasks:delete': (request: { ids: string[]; forceComplete?: boolean }) => {
    results: TaskActionResult[];
  };
  'auth:login': (request: { account: string; password?: string; otpCode?: string; rememberDevice?: boolean; savePassword?: boolean }) => {
    success: boolean;
    requires2fa?: boolean;
  };
  'auth:logout': (request: void) => { success: boolean };
  'auth:status': (request: void) => { status: string; profileId?: string; rememberedDevice?: boolean; savedPassword?: boolean };
  'connection:test': (request: { config: NasConnectionConfig }) => {
    success: boolean;
    diagnostic?: string;
    authenticationError?: boolean;
  };
  'destinations:list': (request: { folderPath?: string }) => { folders: FolderItem[] };
  'nas:preferences': (request: void) => { profileId: string; isManager: boolean; config: DownloadStationConfig };
  'nas:speed': (request: { profileId: string; limits: SpeedLimits }) => { config: DownloadStationConfig };
  'stats:get': (request: void) => { speedDownload: number; speedUpload: number };
  'settings:get': (request: void) => Settings;
  'settings:update': (request: Partial<Settings>) => Settings;
  'polling:start': (request: void) => void;
  'polling:stop': (request: void) => void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
