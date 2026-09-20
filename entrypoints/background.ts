import { onMessage } from '@/core/platform/messaging/message-contracts';
import { AlarmScheduler } from '@/core/platform/scheduler/alarm-scheduler';
import { RefreshCoordinator } from '@/core/platform/scheduler/refresh-coordinator';
import { restrictStorageToTrustedContexts } from '@/core/platform/browser/storage-adapter';
import {
  activeProfileIdStorage,
  profilesStorage,
  sessionDataStorage,
} from '@/core/platform/storage/storage-items';
import { SynoHttpClient } from '@/core/synology/transport/http-client';
import { DiscoveryClient } from '@/core/synology/api-discovery/discovery-client';
import { AuthClient } from '@/core/synology/auth/auth-client';
import { TaskClient } from '@/core/synology/download-station/task-client';
import { StatisticClient } from '@/core/synology/download-station/statistic-client';
import { getBrowserInfo } from '@/core/platform/browser/browser-adapter';
import { normalizeNasUrl } from '@/core/domain/connection/nas-url';
import { TorrentDownloader } from '@/core/domain/torrent-downloader';
import { FileStationClient } from '@/core/synology/file-station/file-station-client';
import { ApiRegistry } from '@/core/synology/api-discovery/api-registry';
import type { DownloadTask } from '@/core/synology/download-station/types';
import { taskTracker } from '@/core/platform/browser/task-tracker';
import { connectionManager } from '@/core/domain/connection/connection-manager';

// Attempt to lock down storage to trusted extension contexts only
restrictStorageToTrustedContexts().catch(() => {});

export default defineBackground(() => {
  const browserInfo = getBrowserInfo();

  // Core Services
  const { sessionManager } = connectionManager;
  const httpClient = new SynoHttpClient();
  const discoveryClient = new DiscoveryClient(httpClient);
  const authClient = new AuthClient(httpClient);
  const taskClient = new TaskClient(httpClient);
  const statisticClient = new StatisticClient(httpClient);
  const scheduler = new AlarmScheduler();

  // Load session state from storage
  const loadSessions = async () => {
    const data = await sessionDataStorage.getValue();
    if (data) {
      sessionManager.loadFromRecord(data as Record<string, import('@/core/synology/auth/types').AuthSession>);
    }
  };

  // --- Context Menus ---
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: 'r22e-download-link',
      title: browser.i18n.getMessage('contextMenuDownload') || 'Send to Synology Download Station',
      contexts: ['link', 'selection'],
    });
  });

  browser.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId !== 'r22e-download-link') return;
    const url = info.linkUrl || info.selectionText;
    if (!url) return;

    if (url.startsWith('http') && url.includes('.torrent')) {
      const originPattern = new URL(url).origin + '/*';
      let hasPermission = await browser.permissions.contains({ origins: [originPattern] });

      if (!hasPermission) {
        hasPermission = await browser.permissions.request({ origins: [originPattern] });
        if (!hasPermission) {
          await browser.windows.create({
            url: browser.runtime.getURL(`/prompt.html?url=${encodeURIComponent(url)}&origin=${encodeURIComponent(originPattern)}`),
            type: 'popup',
            width: 400,
            height: 300,
          });
          return;
        }
      }
    }

    try {
      const activeProfileId = await activeProfileIdStorage.getValue();
      if (!activeProfileId) throw new Error('No active profile');

      const profile = (await profilesStorage.getValue() || []).find(p => p.id === activeProfileId);
      if (!profile) throw new Error('Profile not found');

      const sid = sessionManager.getSid(activeProfileId);
      const synoToken = sessionManager.getSynoToken(activeProfileId);
      if (!sid) throw new Error('Not authenticated');

      const { baseUrl } = normalizeNasUrl(`${profile.protocol}://${profile.host}:${profile.port}`);
      const registry = await discoveryClient.discoverApis(baseUrl);
      const destination = profile.defaultDestination;

      if (url.startsWith('http') && url.includes('.torrent')) {
        const downloader = new TorrentDownloader();
        const { file } = await downloader.fetchTorrent(url);
        await taskClient.create(baseUrl, registry, sid, { file, destination }, { synoToken });
      } else {
        await taskClient.create(baseUrl, registry, sid, { uri: [url], destination }, { synoToken });
      }
    } catch (e) {
      console.error('[R22E] Context menu download failed:', e);
    }
  });

  // --- Auth Message Handlers ---
  onMessage('auth:status', async () => {
    await loadSessions();
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (!activeProfileId) return { status: 'unauthenticated' };

    if (connectionManager.stateMachine.state === 'waiting-for-2fa') {
      return { status: 'waiting-for-2fa', profileId: activeProfileId };
    }

    const isValid = sessionManager.isSessionValid(activeProfileId);
    return {
      status: isValid ? 'authenticated' : 'unauthenticated',
      profileId: activeProfileId,
    };
  });

  onMessage('auth:login', async ({ data }) => {
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (!activeProfileId) throw new Error('No active profile');

    await connectionManager.connect(activeProfileId, data.otpCode, data.password);
    await sessionDataStorage.setValue(sessionManager.toRecord());

    if (connectionManager.stateMachine.state === 'waiting-for-2fa') {
      return { success: false, requires2fa: true };
    }
    return { success: true };
  });

  onMessage('auth:logout', async () => {
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (!activeProfileId) return { success: true };

    await connectionManager.logout(activeProfileId);
    await sessionDataStorage.setValue(sessionManager.toRecord());
    return { success: true };
  });

  onMessage('connection:test', async ({ data }) => {
    try {
      const { baseUrl } = normalizeNasUrl(data.config.url);
      const registry = await discoveryClient.discoverApis(baseUrl);

      if (!data.config.username || !data.config.password) {
        return { success: true, diagnostic: 'Connection successful. Auth skipped.' };
      }

      const result = await authClient.login(
        baseUrl,
        registry,
        data.config.username,
        data.config.password,
      );

      await authClient.logout(baseUrl, registry, result.sid);
      return { success: true, diagnostic: 'Connection and authentication successful.' };
    } catch (e: unknown) {
      return { success: false, diagnostic: e instanceof Error ? e.message : 'Unknown error' };
    }
  });

  // --- Task Caching & Polling ---
  let currentStatsCache = { speedDownload: 0, speedUpload: 0 };
  const registryCache = new Map<string, { registry: ApiRegistry; timestamp: number }>();
  const REGISTRY_TTL = 3600 * 1000;

  const taskFetchLogic = async (profileId: string) => {
    const profile = (await profilesStorage.getValue() || []).find(p => p.id === profileId);
    const sid = sessionManager.getSid(profileId);
    const synoToken = sessionManager.getSynoToken(profileId);

    if (!profile || !sid) {
      await browser.action.setBadgeText({ text: '!' });
      await browser.action.setBadgeBackgroundColor({ color: '#ff0000' });
      await taskTracker.notifyAuthLost(profileId);
      return [];
    }

    const { baseUrl } = normalizeNasUrl(`${profile.protocol}://${profile.host}:${profile.port}`);

    let registry = registryCache.get(profileId)?.registry;
    if (!registry || Date.now() - registryCache.get(profileId)!.timestamp > REGISTRY_TTL) {
      registry = await discoveryClient.discoverApis(baseUrl);
      registryCache.set(profileId, { registry, timestamp: Date.now() });
    }

    const res = await taskClient.list(
      baseUrl,
      registry,
      sid,
      { limit: 1000, additional: ['transfer'] },
      { synoToken },
    );

    const mappedTasks = res.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      size: t.size,
      status: t.status,
      progress: t.additional?.transfer ? (t.size > 0 ? (t.additional.transfer.size_downloaded / t.size) * 100 : 0) : 0,
      speed: t.additional?.transfer ? Math.max(t.additional.transfer.speed_download, t.additional.transfer.speed_upload) : 0,
    }));

    const activeCount = mappedTasks.filter(t => t.status === 'downloading' || t.status === 'extracting').length;
    if (activeCount > 0) {
      await browser.action.setBadgeText({ text: activeCount.toString() });
      await browser.action.setBadgeBackgroundColor({ color: '#2563eb' });
    } else {
      await browser.action.setBadgeText({ text: '' });
    }

    await taskTracker.updateTasks(profileId, res.tasks as DownloadTask[]);

    const stats = await statisticClient.getInfo(baseUrl, registry, sid).catch(() => null);
    if (stats) {
      currentStatsCache = {
        speedDownload: stats.speed_download + stats.emule_speed_download,
        speedUpload: stats.speed_upload + stats.emule_speed_upload,
      };
    }

    scheduler.setAdaptiveInterval('background', activeCount > 0);
    return mappedTasks;
  };

  const refreshCoordinator = new RefreshCoordinator(taskFetchLogic, 2000);

  // Single scheduler registration
  scheduler.onPoll(async () => {
    try {
      await loadSessions();
      const activeProfileId = await activeProfileIdStorage.getValue();
      if (!activeProfileId) {
        await browser.action.setBadgeText({ text: '' });
        return;
      }
      await refreshCoordinator.requestRefresh(activeProfileId).catch(() => []);
    } catch (e) {
      console.error('[R22E] Polling failed', e);
    }
  });
  scheduler.registerAlarmListener();

  // --- UI Message Handlers ---
  onMessage('tasks:refresh_intent', async () => {
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (!activeProfileId) return { tasks: [], stats: currentStatsCache };
    const tasks = await refreshCoordinator.requestRefresh(activeProfileId);
    return { tasks, stats: currentStatsCache };
  });

  onMessage('tasks:list', async () => {
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (!activeProfileId) return { tasks: [], total: 0 };
    const tasks = refreshCoordinator.getCache(activeProfileId) || [];
    return { tasks, total: tasks.length };
  });

  onMessage('stats:get', async () => {
    return currentStatsCache;
  });

  onMessage('tasks:create', async ({ data }) => {
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (!activeProfileId) throw new Error('No active profile');

    const profile = ((await profilesStorage.getValue()) || []).find(
      (p) => p.id === activeProfileId,
    );
    if (!profile) throw new Error('Profile not found');

    const { baseUrl } = normalizeNasUrl(`${profile.protocol}://${profile.host}:${profile.port}`);
    const sid = sessionManager.getSid(activeProfileId);
    const synoToken = sessionManager.getSynoToken(activeProfileId);
    if (!sid) throw new Error('Not authenticated');

    try {
      const registry = await discoveryClient.discoverApis(baseUrl);
      const destination = data.destination || profile.defaultDestination;

      if (data.fileData) {
        const uint8 = new Uint8Array(data.fileData.bytes);
        const file = new File([uint8], data.fileData.name, { type: data.fileData.type });
        await taskClient.create(baseUrl, registry, sid, { file, destination }, { synoToken });
      } else if (data.uri) {
        if (!data.forceDirect && data.uri.startsWith('http') && data.uri.includes('.torrent')) {
          const downloader = new TorrentDownloader();
          const { file } = await downloader.fetchTorrent(data.uri);
          await taskClient.create(baseUrl, registry, sid, { file, destination }, { synoToken });
          return { success: true };
        }

        await taskClient.create(baseUrl, registry, sid, { uri: [data.uri], destination }, { synoToken });
      }

      await refreshCoordinator.requestRefresh(activeProfileId);
      return { success: true };
    } catch (e: unknown) {
      console.error('[R22E] Failed to create task:', e);
      throw e;
    }
  });

  onMessage('destinations:list', async ({ data }) => {
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (!activeProfileId) throw new Error('No active profile');

    const profile = (await profilesStorage.getValue() || []).find(p => p.id === activeProfileId);
    if (!profile) throw new Error('Profile not found');

    const sid = sessionManager.getSid(activeProfileId);
    if (!sid) throw new Error('Not authenticated');

    try {
      const { baseUrl } = normalizeNasUrl(`${profile.protocol}://${profile.host}:${profile.port}`);
      const registry = await discoveryClient.discoverApis(baseUrl);
      const client = new FileStationClient(httpClient);

      if (!data.folderPath) {
        const res = await client.listShares(baseUrl, registry, sid);
        return { folders: res.shares.map(s => ({ id: s.path, name: s.name, path: s.path })) };
      } else {
        const res = await client.listFolder(baseUrl, registry, sid, data.folderPath, { filetype: 'dir' });
        return { folders: res.files.map(f => ({ id: f.path, name: f.name, path: f.path })) };
      }
    } catch (e: unknown) {
      console.error('[R22E] Failed to list destinations:', e);
      throw e;
    }
  });

  console.warn(`[R22E] Background service worker initialized (${browserInfo.name})`);
});