import { onMessage } from '@/core/platform/messaging/message-contracts';
import { AlarmScheduler } from '@/core/platform/scheduler/alarm-scheduler';
import { RefreshCoordinator } from '@/core/platform/scheduler/refresh-coordinator';
import { hasOngoingTasks, liveRefreshInterval, shouldBackgroundPoll } from '@/core/platform/scheduler/polling-policy';
import { restrictStorageToTrustedContexts } from '@/core/platform/browser/storage-adapter';
import { ContextMenuManager } from '@/core/platform/browser/context-menu';
import { showPageToast } from '@/core/platform/browser/page-toast';
import {
  activeProfileIdStorage,
  profilesStorage,
  getAuthDeviceStorageItem,
  getAutoLoginSuppressedStorageItem,
  getRememberedSessionStorageItem,
  getSavedPasswordStorageItem,
  scrapeResultsStorage,
  sessionDataStorage,
  settingsStorage,
  taskSnapshotStorage,
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
import { InvalidCredentialsError, InvalidSessionError, mapSynologyError, SessionExpiredError, SessionReplacedError, SourceIpMismatchError } from '@/core/domain/errors/synology-errors';

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
    // Keep a just-authenticated in-memory SID when a concurrent storage read
    // finishes before the new session has been persisted.
    const data = { ...(await sessionDataStorage.getValue()), ...sessionManager.toRecord() };
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (activeProfileId && !data[activeProfileId] && !await getAutoLoginSuppressedStorageItem(activeProfileId).getValue()) {
      const remembered = await getRememberedSessionStorageItem(activeProfileId).getValue();
      if (remembered?.sid) {
        data[activeProfileId] = remembered;
        await sessionDataStorage.setValue(data);
      }
    }
    sessionManager.loadFromRecord(data);
  };

  const reconnectInFlight = new Map<string, Promise<boolean>>();
  const reconnectWithSavedPassword = (profileId: string): Promise<boolean> => {
    const existing = reconnectInFlight.get(profileId);
    if (existing) return existing;
    const attempt = (async () => {
      if (await getAutoLoginSuppressedStorageItem(profileId).getValue()) return false;
      const savedPassword = await getSavedPasswordStorageItem(profileId).getValue();
      if (!savedPassword) return false;
      try {
        const rememberDevice = Boolean(await getAuthDeviceStorageItem(profileId).getValue());
        await connectionManager.connect(profileId, undefined, savedPassword, rememberDevice);
        if (!sessionManager.isSessionValid(profileId)) return false;
        await sessionDataStorage.setValue(sessionManager.toRecord());
        if (rememberDevice) await getRememberedSessionStorageItem(profileId).setValue(sessionManager.getSession(profileId));
        return true;
      } catch (error) {
        if (mapSynologyError(error) instanceof InvalidCredentialsError) {
          await getAutoLoginSuppressedStorageItem(profileId).setValue(true);
        }
        return false;
      }
    })().finally(() => reconnectInFlight.delete(profileId));
    reconnectInFlight.set(profileId, attempt);
    return attempt;
  };

  const clearInvalidSession = async (profileId: string) => {
    sessionManager.clearSession(profileId);
    await sessionDataStorage.setValue(sessionManager.toRecord());
    await getRememberedSessionStorageItem(profileId).removeValue();
  };

  const isExpiredSession = (error: unknown) => {
    const mapped = mapSynologyError(error);
    return mapped instanceof SessionExpiredError || mapped instanceof SessionReplacedError || mapped instanceof InvalidSessionError || mapped instanceof SourceIpMismatchError;
  };
  const isWaitingFor2fa = () => connectionManager.stateMachine.state === 'waiting-for-2fa';

  // --- Context Menus ---
  const contextMenuPreferences = (settings: Awaited<ReturnType<typeof settingsStorage.getValue>>) => ({
    downloadEnabled: settings.contextMenuDownloadEnabled ?? settings.contextMenuEnabled ?? true,
    scrapeEnabled: settings.contextMenuScrapeEnabled ?? settings.contextMenuEnabled ?? true,
  });

  browser.runtime.onInstalled.addListener(() => {
    settingsStorage.getValue().then(settings => ContextMenuManager.registerMenus(contextMenuPreferences(settings)));
  });

  settingsStorage.watch(settings => {
    ContextMenuManager.registerMenus(contextMenuPreferences(settings));
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'r22e-download-link') {
      const url = info.linkUrl || info.srcUrl || info.selectionText?.trim();
      if (!url) return;

    try {
      if (/^https?:/i.test(url) && /\.torrent(?:$|[?#])/i.test(url)) {
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
      const create = async () => {
        const { profile, baseUrl, registry, sid, synoToken } = await getActiveTaskContext();
        const destination = profile.defaultDestination;
        if (/^https?:/i.test(url) && /\.torrent(?:$|[?#])/i.test(url)) {
          const downloader = new TorrentDownloader();
          const { file } = await downloader.fetchTorrent(url);
          await taskClient.create(baseUrl, registry, sid, { file, destination }, { synoToken });
        } else {
          await taskClient.create(baseUrl, registry, sid, { uri: [url], destination }, { synoToken });
        }
      };
      try {
        await create();
      } catch (error) {
        if (!isExpiredSession(error)) throw error;
        const profileId = await activeProfileIdStorage.getValue();
        if (!profileId) throw error;
        await clearInvalidSession(profileId);
        if (!await reconnectWithSavedPassword(profileId)) throw error;
        await create();
      }
      await showPageToast(tab?.id, url, true);
      const activeProfileId = await activeProfileIdStorage.getValue();
      if (activeProfileId) {
        refreshCoordinator.clearCache(activeProfileId);
        refreshCoordinator.requestRefresh(activeProfileId).catch(error => console.error('[R22E] Context download refresh failed:', error));
      }
    } catch (e) {
      console.error('[R22E] Context menu download failed:', e);
      await showPageToast(tab?.id, url, false);
    }
    } else if (info.menuItemId === 'r22e-scrape-page' && tab?.id) {
      try {
        const results = await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            type Resource = {
              id: string;
              url: string;
              kind: 'link' | 'magnet' | 'torrent' | 'image' | 'video' | 'audio';
              label: string;
            };
            const resources = new Map<string, Omit<Resource, 'id'>>();
            const add = (url: string | null | undefined, kind: Resource['kind'], label?: string | null) => {
              const value = url?.trim();
              if (!value || !/^(https?|ftp|magnet|ed2k):/i.test(value)) return;
              const lowered = value.toLowerCase();
              const resolvedKind = lowered.startsWith('magnet:')
                ? 'magnet'
                : /\.(torrent|nzb)(?:$|[?#])/i.test(value)
                  ? 'torrent'
                  : kind;
              if (!resources.has(value)) {
                resources.set(value, {
                  url: value,
                  kind: resolvedKind,
                  label: label?.trim() || value,
                });
              }
            };

            document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(element => {
              add(element.href, 'link', element.textContent || element.getAttribute('download'));
            });
            document.querySelectorAll<HTMLImageElement>('img[src]').forEach(element => add(element.currentSrc || element.src, 'image', element.alt));
            document.querySelectorAll<HTMLVideoElement>('video[src]').forEach(element => add(element.currentSrc || element.src, 'video', element.title));
            document.querySelectorAll<HTMLAudioElement>('audio[src]').forEach(element => add(element.currentSrc || element.src, 'audio', element.title));
            document.querySelectorAll<HTMLSourceElement>('video source[src], audio source[src]').forEach(element => {
              add(element.src, element.parentElement?.tagName === 'AUDIO' ? 'audio' : 'video');
            });

            return Array.from(resources.values()).map((resource, index) => ({
              ...resource,
              id: `resource-${index}`,
            }));
          }
        });

        const resources = results[0]?.result || [];
        await scrapeResultsStorage.setValue(resources);
        await browser.windows.create({
          url: browser.runtime.getURL('/prompt.html?mode=scrape'),
          type: 'popup',
          width: 520,
          height: 620,
        });
      } catch (e: unknown) {
        console.error('[R22E] Scrape failed:', e);
      }
    }
  });

  // --- Auth Message Handlers ---
  onMessage('auth:status', async () => {
    await loadSessions();
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (!activeProfileId) return { status: 'unauthenticated' };

    const [rememberedDevice, savedPassword] = await Promise.all([
      getAuthDeviceStorageItem(activeProfileId).getValue(),
      getSavedPasswordStorageItem(activeProfileId).getValue(),
    ]);

    if (isWaitingFor2fa()) {
      return { status: 'waiting-for-2fa', profileId: activeProfileId, rememberedDevice: Boolean(rememberedDevice), savedPassword: Boolean(savedPassword) };
    }

    let isValid = sessionManager.isSessionValid(activeProfileId);
    if (!isValid) isValid = await reconnectWithSavedPassword(activeProfileId);
    if (isWaitingFor2fa()) {
      return { status: 'waiting-for-2fa', profileId: activeProfileId, rememberedDevice: Boolean(rememberedDevice), savedPassword: Boolean(savedPassword) };
    }
    return {
      status: isValid ? 'authenticated' : 'unauthenticated',
      profileId: activeProfileId,
      rememberedDevice: Boolean(rememberedDevice),
      savedPassword: Boolean(savedPassword),
    };
  });

  onMessage('auth:login', async ({ data }) => {
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (!activeProfileId) throw new Error('No active profile');

    const savedPasswordItem = getSavedPasswordStorageItem(activeProfileId);
    const password = data.password || await savedPasswordItem.getValue();
    if (!password) throw new Error('Enter your NAS password.');
    await connectionManager.connect(activeProfileId, data.otpCode, password, data.rememberDevice);
    await sessionDataStorage.setValue(sessionManager.toRecord());

    if (connectionManager.stateMachine.state === 'waiting-for-2fa') {
      return { success: false, requires2fa: true };
    }

    if (data.savePassword) await savedPasswordItem.setValue(password);
    else await savedPasswordItem.removeValue();
    if (data.rememberDevice) {
      await getRememberedSessionStorageItem(activeProfileId).setValue(sessionManager.getSession(activeProfileId));
    } else {
      await getRememberedSessionStorageItem(activeProfileId).removeValue();
    }
    await getAutoLoginSuppressedStorageItem(activeProfileId).setValue(false);
    await refreshCoordinator.forceRefresh(activeProfileId).catch(error => console.error('[R22E] Post-login refresh failed', error));
    return { success: true };
  });

  onMessage('auth:logout', async () => {
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (!activeProfileId) return { success: true };

    await getAutoLoginSuppressedStorageItem(activeProfileId).setValue(true);
    await connectionManager.logout(activeProfileId);
    await sessionDataStorage.setValue(sessionManager.toRecord());
    await getRememberedSessionStorageItem(activeProfileId).removeValue();
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
    if (!sessionManager.isSessionValid(profileId)) await reconnectWithSavedPassword(profileId);
    let sid = sessionManager.getSid(profileId);
    let synoToken = sessionManager.getSynoToken(profileId);

    if (!profile || !sid) {
      currentStatsCache = { speedDownload: 0, speedUpload: 0 };
      await browser.action.setBadgeText({ text: '!' });
      await browser.action.setBadgeBackgroundColor({ color: '#ff0000' });
      await taskTracker.notifyAuthLost(profileId);
      await taskSnapshotStorage.setValue({
        profileId,
        tasks: [],
        stats: currentStatsCache,
        updatedAt: Date.now(),
        error: 'Authentication required',
      });
      if (liveClients.size === 0) scheduler.setAdaptiveInterval('background', false);
      return [];
    }

    const { baseUrl } = normalizeNasUrl(`${profile.protocol}://${profile.host}:${profile.port}`);

    let registry = registryCache.get(profileId)?.registry;
    if (!registry || Date.now() - registryCache.get(profileId)!.timestamp > REGISTRY_TTL) {
      registry = await discoveryClient.discoverApis(baseUrl);
      registryCache.set(profileId, { registry, timestamp: Date.now() });
    }

    const fetchTasks = () => {
      if (!sid) throw new Error('Not authenticated');
      return taskClient.list(
        baseUrl,
        registry,
        sid,
        { limit: 1000, additional: ['detail', 'transfer', 'file'] },
        { synoToken },
      );
    };
    let res;
    try {
      res = await fetchTasks();
    } catch (error) {
      if (!isExpiredSession(error)) throw error;
      await clearInvalidSession(profileId);
      if (!await reconnectWithSavedPassword(profileId)) {
        currentStatsCache = { speedDownload: 0, speedUpload: 0 };
        await taskTracker.notifyAuthLost(profileId);
        await taskSnapshotStorage.setValue({
          profileId,
          tasks: [],
          stats: currentStatsCache,
          updatedAt: Date.now(),
          error: 'Authentication required',
        });
        if (liveClients.size === 0) scheduler.setAdaptiveInterval('background', false);
        return [];
      }
      sid = sessionManager.getSid(profileId);
      synoToken = sessionManager.getSynoToken(profileId);
      res = await fetchTasks();
    }

    const activeCount = res.tasks.filter((t: DownloadTask) => ['waiting', 'downloading', 'extracting', 'hash_checking'].includes(t.status)).length;
    const downloadingCount = res.tasks.filter((t: DownloadTask) => t.status === 'downloading').length;
    const failedCount = res.tasks.filter((t: DownloadTask) => t.status === 'error').length;
    const settings = await settingsStorage.getValue();
    const badgeCount = settings.badgeMode === 'active'
      ? activeCount
      : settings.badgeMode === 'downloading'
        ? downloadingCount
        : settings.badgeMode === 'failed'
          ? failedCount
          : 0;
    if (badgeCount > 0) {
      await browser.action.setBadgeText({ text: badgeCount.toString() });
      await browser.action.setBadgeBackgroundColor({ color: '#2563eb' });
    } else {
      await browser.action.setBadgeText({ text: '' });
    }

    await taskTracker.updateTasks(profileId, res.tasks as DownloadTask[]);

    const stats = await statisticClient.getInfo(baseUrl, registry, sid!).catch(() => null);
    if (stats) {
      currentStatsCache = {
        speedDownload: stats.speed_download + stats.emule_speed_download,
        speedUpload: stats.speed_upload + stats.emule_speed_upload,
      };
    } else {
      currentStatsCache = { speedDownload: 0, speedUpload: 0 };
    }

    await taskSnapshotStorage.setValue({
      profileId,
      tasks: res.tasks as DownloadTask[],
      stats: currentStatsCache,
      updatedAt: Date.now(),
    });
    if (liveClients.size === 0) {
      scheduler.setAdaptiveInterval('background', shouldBackgroundPoll(activeCount > 0, settings.backgroundPollingEnabled));
    } else {
      void syncLiveRefresh().catch(error => console.error('[R22E] Live refresh scheduling failed', error));
    }
    return res.tasks as DownloadTask[];
  };

  const refreshCoordinator = new RefreshCoordinator(taskFetchLogic, 2000);
  const liveClients = new Set<string>();
  let liveRefreshTimer: ReturnType<typeof setInterval> | null = null;
  let liveRefreshEveryMs = 0;

  const refreshActiveProfile = async () => {
    await loadSessions();
    const profileId = await activeProfileIdStorage.getValue();
    if (!profileId) {
      currentStatsCache = { speedDownload: 0, speedUpload: 0 };
      await taskSnapshotStorage.setValue({
        profileId: null,
        tasks: [],
        stats: currentStatsCache,
        updatedAt: Date.now(),
      });
      if (liveClients.size === 0) scheduler.setAdaptiveInterval('background', false);
      return;
    }
    await refreshCoordinator.requestRefresh(profileId);
  };

  const syncLiveRefresh = async (refreshNow = false) => {
    const snapshot = await taskSnapshotStorage.getValue();
    const profileId = await activeProfileIdStorage.getValue();
    const settings = await settingsStorage.getValue();
    const hasActiveDownloads = snapshot.profileId === profileId && hasOngoingTasks(snapshot.tasks);
    if (liveClients.size === 0) {
      if (liveRefreshTimer !== null) clearInterval(liveRefreshTimer);
      liveRefreshTimer = null;
      liveRefreshEveryMs = 0;
      scheduler.setAdaptiveInterval('background', shouldBackgroundPoll(hasActiveDownloads, settings.backgroundPollingEnabled));
      return;
    }

    scheduler.stopPolling();
    const nextInterval = liveRefreshInterval(settings.pollingInterval, hasActiveDownloads);
    if (liveRefreshTimer === null || liveRefreshEveryMs !== nextInterval) {
      if (liveRefreshTimer !== null) clearInterval(liveRefreshTimer);
      liveRefreshEveryMs = nextInterval;
      liveRefreshTimer = setInterval(() => {
        refreshActiveProfile()
          .then(() => syncLiveRefresh())
          .catch(error => console.error('[R22E] Live refresh failed', error));
      }, nextInterval);
    }
    if (refreshNow) {
      refreshActiveProfile()
        .then(() => syncLiveRefresh())
        .catch(error => console.error('[R22E] Initial live refresh failed', error));
    }
  };

  browser.runtime.onConnect.addListener(port => {
    if (port.name !== 'r22e-live-state') return;
    const clientId = crypto.randomUUID();
    liveClients.add(clientId);
    syncLiveRefresh(true).catch(() => {});
    port.onDisconnect.addListener(() => {
      liveClients.delete(clientId);
      syncLiveRefresh().catch(() => {});
    });
  });

  settingsStorage.watch(() => {
    syncLiveRefresh().catch(() => {});
  });

  // Single scheduler registration
  scheduler.onPoll(async () => {
    try {
      await loadSessions();
      const activeProfileId = await activeProfileIdStorage.getValue();
      if (!activeProfileId) {
        await browser.action.setBadgeText({ text: '' });
        scheduler.setAdaptiveInterval('background', false);
        return;
      }
      await refreshCoordinator.requestRefresh(activeProfileId).catch(() => []);
    } catch (e) {
      console.error('[R22E] Polling failed', e);
    }
  });
  scheduler.registerAlarmListener();
  browser.runtime.onStartup.addListener(() => {
    refreshActiveProfile().catch(error => console.error('[R22E] Startup refresh failed', error));
  });

  // --- UI Message Handlers ---
  onMessage('tasks:refresh_intent', async () => {
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (!activeProfileId) return { tasks: [], stats: currentStatsCache };
    const tasks = await refreshCoordinator.forceRefresh(activeProfileId);
    return { tasks, stats: currentStatsCache };
  });

  onMessage('tasks:list', async () => {
    const activeProfileId = await activeProfileIdStorage.getValue();
    if (!activeProfileId) return { tasks: [], total: 0, stats: { speedDownload: 0, speedUpload: 0 } };
    const tasks = refreshCoordinator.getCache(activeProfileId) || [];
    return { tasks, total: tasks.length, stats: currentStatsCache };
  });

  onMessage('stats:get', async () => {
    return currentStatsCache;
  });

  const getActiveTaskContext = async () => {
    await loadSessions();
    const profileId = await activeProfileIdStorage.getValue();
    if (!profileId) throw new Error('No active profile');
    const profile = (await profilesStorage.getValue()).find(item => item.id === profileId);
    if (!profile) throw new Error('Profile not found');
    if (!sessionManager.isSessionValid(profileId)) await reconnectWithSavedPassword(profileId);
    const sid = sessionManager.getSid(profileId);
    if (!sid) throw new Error('Not authenticated');
    const synoToken = sessionManager.getSynoToken(profileId);
    const { baseUrl } = normalizeNasUrl(`${profile.protocol}://${profile.host}:${profile.port}`);
    const registry = await discoveryClient.discoverApis(baseUrl);
    return { profileId, profile, sid, synoToken, baseUrl, registry };
  };

  const refreshAfterMutation = async (profileId: string) => {
    refreshCoordinator.clearCache(profileId);
    await refreshCoordinator.requestRefresh(profileId);
  };

  onMessage('tasks:pause', async ({ data }) => {
    const context = await getActiveTaskContext();
    const results = await taskClient.pause(
      context.baseUrl,
      context.registry,
      context.sid,
      data.ids,
      { synoToken: context.synoToken },
    );
    await refreshAfterMutation(context.profileId);
    return { results: data.ids.map(id => ({
      id,
      success: !results.find(result => result.id === id)?.error,
      error: results.find(result => result.id === id)?.error?.toString(),
    })) };
  });

  onMessage('tasks:resume', async ({ data }) => {
    const context = await getActiveTaskContext();
    const results = await taskClient.resume(
      context.baseUrl,
      context.registry,
      context.sid,
      data.ids,
      { synoToken: context.synoToken },
    );
    await refreshAfterMutation(context.profileId);
    return { results: data.ids.map(id => ({
      id,
      success: !results.find(result => result.id === id)?.error,
      error: results.find(result => result.id === id)?.error?.toString(),
    })) };
  });

  onMessage('tasks:delete', async ({ data }) => {
    const context = await getActiveTaskContext();
    const results = await taskClient.delete(
      context.baseUrl,
      context.registry,
      context.sid,
      data.ids,
      data.forceComplete,
      { synoToken: context.synoToken },
    );
    await refreshAfterMutation(context.profileId);
    return { results: data.ids.map(id => ({
      id,
      success: !results.find(result => result.id === id)?.error,
      error: results.find(result => result.id === id)?.error?.toString(),
    })) };
  });

  onMessage('tasks:create', async ({ data }) => {
    const context = await getActiveTaskContext();
    const destination = data.destination || context.profile.defaultDestination;
    const inputs = [...new Set([...(data.uris || []), ...(data.uri ? [data.uri] : [])].map(value => value.trim()).filter(Boolean))];
    if (data.fileData && inputs.length > 0) throw new Error('Choose either URLs or a task file.');
    if (!data.fileData && inputs.length === 0) throw new Error('Add at least one URL or a task file.');

    const results: Array<{ input: string; success: boolean; error?: string }> = [];
    if (data.fileData) {
      const fileName = data.fileData.name;
      if (!/\.(torrent|nzb)$/i.test(fileName)) throw new Error('Only .torrent and .nzb files are supported.');
      try {
        const file = new File([new Uint8Array(data.fileData.bytes)], fileName, { type: data.fileData.type });
        await taskClient.create(
          context.baseUrl,
          context.registry,
          context.sid,
          { file, destination },
          { synoToken: context.synoToken },
        );
        results.push({ input: fileName, success: true });
      } catch (error) {
        results.push({ input: fileName, success: false, error: error instanceof Error ? error.message : 'Upload failed' });
      }
    } else {
      for (const uri of inputs) {
        try {
          if (!data.forceDirect && /^https?:/i.test(uri) && /\.torrent(?:$|[?#])/i.test(uri)) {
            const downloader = new TorrentDownloader();
            const { file } = await downloader.fetchTorrent(uri);
            await taskClient.create(
              context.baseUrl,
              context.registry,
              context.sid,
              { file, destination },
              { synoToken: context.synoToken },
            );
          } else {
            await taskClient.create(
              context.baseUrl,
              context.registry,
              context.sid,
              { uri: [uri], destination },
              { synoToken: context.synoToken },
            );
          }
          results.push({ input: uri, success: true });
        } catch (error) {
          results.push({ input: uri, success: false, error: error instanceof Error ? error.message : 'Task creation failed' });
        }
      }
    }

    if (results.some(result => result.success)) await refreshAfterMutation(context.profileId);
    return { success: results.every(result => result.success), results };
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
