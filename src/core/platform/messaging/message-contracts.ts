import { defineExtensionMessaging } from '@webext-core/messaging';

export interface DownloadTask {
  id: string;
  title: string;
  size: number;
  status: string;
  progress: number;
  speed: number;
}

export interface TaskActionResult {
  id: string;
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
  'tasks:list': (data: { additional?: string[] }) => { tasks: DownloadTask[]; total: number };
  'tasks:refresh_intent': (data: Record<string, never>) => { tasks: DownloadTask[]; stats: { speedDownload: number; speedUpload: number } };
  'tasks:create': (request: { uri?: string; destination?: string; fileData?: { name: string, type: string, bytes: number[] }; forceDirect?: boolean }) => { success: boolean; error?: string };
  'tasks:pause': (request: { ids: string[] }) => { results: TaskActionResult[] };
  'tasks:resume': (request: { ids: string[] }) => { results: TaskActionResult[] };
  'tasks:delete': (request: { ids: string[]; forceComplete?: boolean }) => {
    results: TaskActionResult[];
  };
  'auth:login': (request: { account: string; password?: string; otpCode?: string }) => {
    success: boolean;
    requires2fa?: boolean;
  };
  'auth:logout': (request: void) => { success: boolean };
  'auth:status': (request: void) => { status: string; profileId?: string };
  'connection:test': (request: { config: NasConnectionConfig }) => {
    success: boolean;
    diagnostic?: string;
  };
  'destinations:list': (request: { folderPath?: string }) => { folders: FolderItem[] };
  'stats:get': (request: void) => { speedDownload: number; speedUpload: number };
  'settings:get': (request: void) => Settings;
  'settings:update': (request: Partial<Settings>) => Settings;
  'polling:start': (request: void) => void;
  'polling:stop': (request: void) => void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
