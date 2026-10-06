import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { Bell, CircleAlert, Database, ExternalLink, Folder, Gauge, Globe2, Info, Palette, Play, Plus, RefreshCw, Server, Trash2 } from 'lucide-preact';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { PasswordInput } from '../Input/PasswordInput';
import { SelectControl } from '../SelectControl/SelectControl';
import { addProfile, activeProfileId, profiles, removeProfile, settings, setActiveProfile, updateProfile, updateSettings } from '../../state/app-state';
import { currentView, navigateTo, settingsSection } from '../../state/navigation';
import { testConnection } from '../../utils/connection-tester';
import { sendMessage } from '@/core/platform/messaging/message-contracts';
import { normalizeNasUrl } from '@/core/domain/connection/nas-url';
import { discoverQuickConnectEndpoints, normalizeQuickConnectId } from '@/core/domain/connection/quickconnect';
import { PermissionsManager } from '@/core/platform/browser/permissions';
import { getBrowserInfo } from '@/core/platform/browser/browser-adapter';
import { SettingsBackup } from '../SettingsBackup/SettingsBackup';
import { AppearanceEditor } from '../AppearanceEditor/AppearanceEditor';
import { completionSounds, getCompletionSound, type CompletionSoundId } from '@/core/platform/browser/completion-sounds';
import { DownloadPreferences } from '../DownloadPreferences/DownloadPreferences';
import styles from './SettingsView.module.css';

type Section = 'connection' | 'location' | 'speed' | 'refresh' | 'browser' | 'appearance' | 'notifications' | 'data' | 'about';
interface AddressDraft {
  url: string;
  localProtocol: 'http' | 'https';
  connectionType: 'local' | 'quickconnect';
  quickConnectId: string;
  quickConnectRoutes: { id: string; urls: string[] } | null;
}
const sections: Array<{ id: Section; label: string; icon: typeof Server }> = [
  { id: 'connection', label: 'Connection', icon: Server },
  { id: 'location', label: 'Location', icon: Folder },
  { id: 'speed', label: 'Speed', icon: Gauge },
  { id: 'refresh', label: 'Refresh', icon: RefreshCw },
  { id: 'browser', label: 'Browser', icon: Globe2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'about', label: 'About', icon: Info },
];

const projectUrl = 'https://github.com/r22ehq/Synology-Download-Station-by-R22E';
const websiteUrl = 'https://r22e.com';
const chromeStoreUrl = 'https://chromewebstore.google.com/detail/synology-download-station/fghcklhmghcmhfhhhcmjfenchgghmanp';
const edgeStoreUrl = 'https://microsoftedge.microsoft.com/addons/detail/dlaehmkhjnclaljfhkleblhdjgcjloom';
const firefoxStoreUrl = 'https://addons.mozilla.org/en-US/firefox/addon/r22e-station/';
const certificateHelpUrl = 'https://kb.synology.com/en-my/DSM/tutorial/Why_did_I_see_a_not_secure_warning_in_the_browser_when_connecting_to_my_Synology_product';

const displayUrl = (profile: { protocol: string; host: string; port: number }) => `${profile.protocol}://${profile.host}:${profile.port}`;
const hasAddress = (value: string) => value.trim().replace(/^https?:\/\//i, '').trim().length > 0;

const endpointCandidates = (value: string, defaultProtocol: 'http' | 'https' = 'https') => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(trimmed)) return [trimmed];
  if (/:(\d+)$/.test(trimmed)) return [`${defaultProtocol}://${trimmed}`];
  return [`${defaultProtocol}://${trimmed}:${defaultProtocol === 'https' ? 5001 : 5000}`];
};

const isHttpsIpAddress = (value: string, defaultProtocol: 'http' | 'https') => {
  try {
    const { protocol, host } = normalizeNasUrl(endpointCandidates(value, defaultProtocol)[0]!);
    return protocol === 'https' && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host);
  } catch {
    return false;
  }
};

export function SettingsView({ onAddNas, inActionPopup = false }: { onAddNas: () => void; inActionPopup?: boolean }) {
  const isAdding = currentView.value === 'add_nas';
  const [section, setSection] = useState<Section>(settingsSection.value);
  const [url, setUrl] = useState('');
  const [localProtocol, setLocalProtocol] = useState<'http' | 'https'>('http');
  const [connectionType, setConnectionType] = useState<'local' | 'quickconnect'>('local');
  const [quickConnectId, setQuickConnectId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [waitingFor2fa, setWaitingFor2fa] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const pendingProfile = useRef<{ id: string; endpoint: string; username: string } | null>(null);
  const previousActiveProfileId = useRef<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [permissionKey, setPermissionKey] = useState('');
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [quickConnectRoutes, setQuickConnectRoutes] = useState<{ id: string; urls: string[] } | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const addressEdited = useRef(false);
  const draftKey = 'nasSetupAddress';
  let accessUrls: string[] = [];
  try {
    accessUrls = connectionType === 'local'
      ? (hasAddress(url) ? [normalizeNasUrl(endpointCandidates(url, localProtocol)[0]!).baseUrl] : [])
      : (quickConnectRoutes?.id === quickConnectId.trim() ? quickConnectRoutes.urls : []);
  } catch { /* An incomplete address cannot request access. */ }
  const accessKey = JSON.stringify(accessUrls);
  const canEnterCredentials = accessUrls.length > 0 && permissionKey === accessKey;

  // Only the address step survives a closed popup. Never persist credentials
  // or OTPs from an unfinished form, even temporarily.
  useEffect(() => {
    if (!isAdding) return;
    void browser.storage.session.get(draftKey).then(data => {
      const draft = data[draftKey] as Partial<AddressDraft> | undefined;
      if (!addressEdited.current && draft && typeof draft.url === 'string') {
        setUrl(draft.url);
        setLocalProtocol(draft.localProtocol === 'https' ? 'https' : 'http');
        setConnectionType(draft.connectionType === 'quickconnect' ? 'quickconnect' : 'local');
        setQuickConnectId(typeof draft.quickConnectId === 'string' ? draft.quickConnectId : '');
        const routes = draft.quickConnectRoutes;
        if (routes && typeof routes.id === 'string' && Array.isArray(routes.urls) && routes.urls.every(value => typeof value === 'string')) setQuickConnectRoutes(routes);
      }
    }).catch(() => {}).finally(() => setDraftLoaded(true));
  }, [isAdding]);

  useEffect(() => {
    if (!isAdding || !draftLoaded) return;
    void browser.storage.session.set({ [draftKey]: { url, localProtocol, connectionType, quickConnectId, quickConnectRoutes } }).catch(() => {});
  }, [isAdding, draftLoaded, url, localProtocol, connectionType, quickConnectId, quickConnectRoutes]);

  useEffect(() => {
    let cancelled = false;
    setPermissionKey('');
    if (accessUrls.length) {
      void Promise.all(accessUrls.map(value => PermissionsManager.hasHostPermission(value))).then(grants => {
        if (!cancelled && grants.every(Boolean)) setPermissionKey(accessKey);
      });
    }
    return () => { cancelled = true; };
  }, [accessKey]);
  const httpsIpAddress = connectionType === 'local' && isHttpsIpAddress(url, localProtocol);
  const quickConnectAddress = connectionType === 'local' && /(?:^|\.)direct\.quickconnect\.to(?::\d+)?(?:\/|$)/i.test(url.trim().replace(/^https?:\/\//i, ''));
  const usesHttp = connectionType === 'local' && localProtocol === 'http';
  const hasNasAddress = url.trim().replace(/^https?:\/\//i, '').trim().length > 0;

  const updateNasAddress = (value: string) => {
    addressEdited.current = true;
    setPermissionKey('');
    setUrl(value);
    if (/^http:\/\//i.test(value)) setLocalProtocol('http');
    else if (/^https:\/\//i.test(value)) setLocalProtocol('https');
    setTestResult(null);
  };

  const selectLocalProtocol = (protocol: 'http' | 'https') => {
    const address = url.trim().replace(/^https?:\/\//i, '');
    const match = address.match(/^(\[[^\]]+\]|[^/:?#]+)(?::(\d+))?(.*)$/);
    const port = match?.[2];
    const nextPort = !port || port === '5000' || port === '5001' ? String(protocol === 'https' ? 5001 : 5000) : port;
    setLocalProtocol(protocol);
    updateNasAddress(match ? `${protocol}://${match[1]}:${nextPort}${match[3]}` : `${protocol}://`);
  };

  const previewCompletionSound = () => {
    const sound = getCompletionSound(settings.value?.completionSound);
    const audio = new Audio(browser.runtime.getURL(`/${sound.file}`));
    audio.volume = 0.75;
    void audio.play().catch(() => {});
  };

  const requestConnectionPermission = async (connectionUrl: string) => {
    // Start the request before any await: Firefox requires the original
    // button gesture. An existing grant also covers later endpoint checks.
    if (await PermissionsManager.requestHostPermission(connectionUrl)) return true;
    return PermissionsManager.hasHostPermission(connectionUrl);
  };

  const requestWithVisiblePrompt = (request: () => Promise<boolean>) => {
    // Firefox anchors this prompt to the browser window behind the action
    // popup. Start it on the button gesture, then dismiss only that popup.
    const result = request();
    if (inActionPopup && getBrowserInfo().name === 'firefox') {
      const saveDraft = browser.storage.session.set({
        [draftKey]: { url, localProtocol, connectionType, quickConnectId, quickConnectRoutes },
        nasSetupResumeAfterPermission: true,
      }).catch(() => {});
      let pending = true;
      let closingForPrompt = false;
      const closeTimer = window.setTimeout(() => {
        void saveDraft.then(() => {
          if (pending) {
            closingForPrompt = true;
            window.close();
          }
        });
      }, 250);
      const finish = () => {
        pending = false;
        window.clearTimeout(closeTimer);
        if (!closingForPrompt) void saveDraft.then(() => browser.storage.session.remove('nasSetupResumeAfterPermission')).catch(() => {});
      };
      void result.then(finish, finish);
    }
    return result;
  };

  const prepareAccess = async () => {
    setIsRequestingAccess(true);
    setTestResult(null);
    try {
      if (connectionType === 'quickconnect' && !accessUrls.length) {
        const id = normalizeQuickConnectId(quickConnectId);
        // Permission requests start directly in the click handler, before any
        // asynchronous discovery. Endpoint access uses a separate click.
        if (!await requestWithVisiblePrompt(() => requestConnectionPermission('https://global.quickconnect.to'))) throw new Error('Allow QuickConnect access to find your NAS.');
        const urls = await discoverQuickConnectEndpoints(id);
        setQuickConnectRoutes({ id, urls });
        return;
      }
      if (!accessUrls.length) throw new Error('Enter a valid NAS address first.');
      if (!await requestWithVisiblePrompt(() => PermissionsManager.requestHostPermissions(accessUrls))) throw new Error('NAS access was not allowed. Try again before entering your credentials.');
      setPermissionKey(accessKey);
    } catch (error) {
      setTestResult({ success: false, msg: error instanceof Error ? error.message : 'Could not request NAS access.' });
    } finally {
      setIsRequestingAccess(false);
    }
  };

  const resolveEndpoint = async (checkCredentials = true) => {
    const diagnostics: string[] = [];
    let candidates: string[];
    if (connectionType === 'quickconnect') {
      candidates = accessUrls;
    } else {
      candidates = endpointCandidates(url, localProtocol);
    }
    if (!canEnterCredentials) throw new Error('Allow NAS access before testing or connecting.');
    for (const candidate of candidates) {
      const normalized = normalizeNasUrl(candidate);
      if (connectionType === 'local' && normalized.protocol !== localProtocol) throw new Error('Choose the matching Local HTTPS or Local HTTP option for this address.');
      const normalizedUrl = `${normalized.protocol}://${normalized.host}:${normalized.port}`;
      if (!await PermissionsManager.hasHostPermission(normalizedUrl)) {
        diagnostics.push(`${normalizedUrl}: permission denied`);
        continue;
      }
      const result = await testConnection({ url: normalizedUrl, username, password: checkCredentials ? password : '' });
      if (result.success) return { normalized, result };
      if (result.authenticationError) throw new Error(result.diagnostic || 'Sign-in failed. Check your NAS account.');
      diagnostics.push(`${normalizedUrl}: ${result.diagnostic || 'unavailable'}`);
    }
    const prefix = connectionType === 'quickconnect'
      ? 'No direct QuickConnect route worked. Relay connections are not supported by this experimental option.'
      : 'The NAS could not be reached.';
    throw new Error(`${prefix} Checked ${diagnostics.join(' and ')}.`);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const { normalized, result } = await resolveEndpoint();
      setTestResult({ success: true, msg: `${result.diagnostic || 'Connection successful.'} Endpoint: ${normalized.baseUrl}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid NAS address.';
      setTestResult({ success: false, msg: httpsIpAddress && /Failed to fetch|NetworkError|network request failed/i.test(message)
        ? 'HTTPS could not verify or reach this IP. If your NAS has a secure hostname, use it here. Otherwise you can choose local HTTP below, with an explicit security warning.'
        : message === 'Failed to fetch' ? 'The NAS could not be reached. Check its address, port, and certificate.' : message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      if (!password) throw new Error('Enter your NAS password to connect.');
      if (waitingFor2fa && !otpCode.trim()) throw new Error('Enter the verification code.');
      const normalized = (await resolveEndpoint(false)).normalized;
      const normalizedUrl = `${normalized.protocol}://${normalized.host}:${normalized.port}`;
      const profile = {
        name: connectionType === 'quickconnect' ? normalizeQuickConnectId(quickConnectId) : normalized.host,
        protocol: normalized.protocol,
        host: normalized.host,
        port: normalized.port,
        username,
        ...(connectionType === 'quickconnect' ? { quickConnectId: normalizeQuickConnectId(quickConnectId) } : {}),
      };
      let profileId = pendingProfile.current?.id;
      if (!profileId) {
        previousActiveProfileId.current = activeProfileId.value;
        profileId = await addProfile(profile);
      } else if (pendingProfile.current?.endpoint !== normalizedUrl || pendingProfile.current?.username !== username) {
        await updateProfile(profileId, profile);
      }
      pendingProfile.current = { id: profileId, endpoint: normalizedUrl, username };
      await setActiveProfile(profileId);
      const result = await sendMessage('auth:login', {
        account: username,
        password,
        otpCode: otpCode.trim() || undefined,
        rememberDevice,
        savePassword,
      });
      if (result.requires2fa) {
        setWaitingFor2fa(true);
        setTestResult({ success: true, msg: 'Enter the verification code below to finish connecting.' });
        return;
      }
      setPassword(''); setOtpCode(''); setWaitingFor2fa(false); setTestResult(null);
      await browser.storage.session.remove(draftKey);
      navigateTo('main');
    } catch (error) {
      if (!waitingFor2fa && pendingProfile.current) {
        await removeProfile(pendingProfile.current.id);
        if (previousActiveProfileId.current) await setActiveProfile(previousActiveProfileId.current);
        pendingProfile.current = null;
      }
      setTestResult({ success: false, msg: error instanceof Error ? error.message : 'Invalid NAS address.' });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelSetup = async () => {
    await browser.storage.session.remove(draftKey);
    if (pendingProfile.current) {
      await removeProfile(pendingProfile.current.id);
      if (previousActiveProfileId.current) await setActiveProfile(previousActiveProfileId.current);
      pendingProfile.current = null;
    }
    navigateTo('settings');
  };

  const removeConnection = async (id: string, name: string) => {
    if (!confirm(`Remove the NAS profile “${name}” and its local session data?`)) return;
    await removeProfile(id);
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (!enabled) {
      await updateSettings({ notificationsEnabled: false });
      return;
    }
    const granted = await browser.permissions.request({ permissions: ['notifications'] });
    await updateSettings({ notificationsEnabled: granted });
  };

  if (isAdding) {
    return (
      <div className={styles.addPage}>
        <div className={styles.pageHeading}><div><h2>New connection</h2><p>Enter your NAS address and allow access before entering your credentials.</p></div></div>
        <div className={styles.formCard}>
          <fieldset className={styles.connectionMethods}>
            <legend>Connection method</legend>
            <label><input type="radio" name="connection-method" checked={connectionType === 'local'} onChange={() => { setConnectionType('local'); setTestResult(null); }} /><span>Local <strong>Recommended</strong><small>Connect to your NAS on your network.</small></span></label>
            <label><input type="radio" name="connection-method" checked={connectionType === 'quickconnect'} onChange={() => { setConnectionType('quickconnect'); setTestResult(null); }} /><span>QuickConnect <em>Unofficial · may break</em><small>Enter just your QuickConnect ID. Direct connections only; relay is not supported.</small></span></label>
          </fieldset>
          {connectionType === 'local'
            ? <>
              <div className={styles.protocolChoices} role="group" aria-label="Local connection protocol">
                <button type="button" aria-pressed={usesHttp} className={usesHttp ? styles.protocolActive : ''} onClick={() => selectLocalProtocol('http')}><strong>Local HTTP</strong><small>Port 5000 · not encrypted</small></button>
                <button type="button" aria-pressed={!usesHttp} className={!usesHttp ? styles.protocolActive : ''} onClick={() => selectLocalProtocol('https')}><strong>Local HTTPS</strong><small>Port 5001 · valid certificate required</small></button>
              </div>
              <Input id="nas-url" label="NAS address" value={url} onInput={event => updateNasAddress(event.currentTarget.value)} placeholder={usesHttp ? 'http://192.168.0.81:5000' : 'https://your-nas.example.com:5001'} />
              <div className={styles.connectionHint}>
                {usesHttp
                  ? <span>Not encrypted. Use only on a trusted local network.</span>
                  : quickConnectAddress
                    ? <span>This is a QuickConnect address, not an independent local hostname.</span>
                  : httpsIpAddress
                    ? <span>This IP may not match your NAS certificate. Use a certified local hostname.</span>
                    : <span>Use a local hostname with a valid certificate.</span>}
                {!usesHttp && <> <a className={styles.certificateLink} href={certificateHelpUrl} target="_blank" rel="noopener noreferrer">HTTPS certificate guide <ExternalLink size={12} aria-hidden="true" /></a></>}
              </div>
            </>
            : <Input id="quickconnect-id" label="QuickConnect ID" helperText="We find a direct Synology address. Relay is not supported." value={quickConnectId} onInput={event => { addressEdited.current = true; setQuickConnectId(event.currentTarget.value); }} placeholder="your-quickconnect-id" />}
          {!canEnterCredentials && <Button size="sm" onClick={prepareAccess} isLoading={isRequestingAccess} disabled={!(connectionType === 'local' ? hasNasAddress : quickConnectId.trim())}>{connectionType === 'quickconnect' && !accessUrls.length ? 'Find direct NAS address' : 'Allow NAS access'}</Button>}
          <Input id="nas-username" label="Username" disabled={!canEnterCredentials} value={username} onInput={event => setUsername(event.currentTarget.value)} autocomplete="username" />
          <PasswordInput id="nas-password" label="Password" disabled={!canEnterCredentials} value={password} onInput={event => setPassword(event.currentTarget.value)} autocomplete="current-password" placeholder="Password" />
          {waitingFor2fa && <Input id="nas-otp" label="Verification code" value={otpCode} onInput={event => setOtpCode(event.currentTarget.value)} inputMode="numeric" autocomplete="one-time-code" placeholder="Verification code" />}
          <label className={styles.saveOption}><input type="checkbox" checked={rememberDevice} onChange={event => setRememberDevice(event.currentTarget.checked)} /><span>Remember this device <small>Keep the NAS session and device token in this browser.</small></span></label>
          <label className={styles.saveOption}><input type="checkbox" checked={savePassword} onChange={event => setSavePassword(event.currentTarget.checked)} /><span><span className={styles.optionTitle}>Save password on this device <strong className={styles.recommended}>Recommended</strong></span><small className={styles.optionInfo}><CircleAlert size={13} aria-hidden="true" />Allows automatic sign-in when your NAS expires the session. Two-step verification may still be required. Stored only in this browser.</small></span></label>
          {testResult && <div className={testResult.success ? styles.success : styles.error} role="status">{testResult.msg}</div>}
          <div className={styles.actions}>
            <Button variant="ghost" size="sm" onClick={cancelSetup}>Cancel</Button>
            <Button variant="secondary" size="sm" onClick={handleTest} isLoading={isTesting} disabled={isSaving || !canEnterCredentials || !username}>Test connection</Button>
            <Button size="sm" onClick={handleSave} isLoading={isSaving} disabled={isTesting || !canEnterCredentials || !username}>{waitingFor2fa ? 'Verify and connect' : 'Save and connect'}</Button>
          </div>
        </div>
      </div>
    );
  }

  const content = {
    location: <DownloadPreferences section="location" />,
    speed: <DownloadPreferences section="speed" />,
    connection: <>
      <div className={styles.pageHeading}><div><h2>Connection</h2><p>Switch profiles or add another Synology NAS.</p></div><Button size="sm" icon={<Plus size={15} />} onClick={onAddNas}>Add NAS</Button></div>
      <div className={styles.profileList}>
        {!profiles.value.length && <div className={styles.empty}>No NAS profiles have been added.</div>}
        {profiles.value.map(profile => <article className={`${styles.profileCard} ${activeProfileId.value === profile.id ? styles.activeProfile : ''}`} key={profile.id}>
          <button className={styles.profileSelect} onClick={() => setActiveProfile(profile.id)}>
            <span className={styles.profileIcon}><Server size={18} /></span>
            <span><strong>{profile.name}</strong><small>{profile.quickConnectId ? 'QuickConnect (direct)' : displayUrl(profile)} · {profile.username}</small></span>
          </button>
          {activeProfileId.value === profile.id && <span className={styles.activePill}>Active</span>}
          <Button variant="ghost" size="sm" onClick={() => removeConnection(profile.id, profile.name)} aria-label={`Remove ${profile.name}`}><Trash2 size={15} /></Button>
        </article>)}
      </div>
    </>,
    refresh: <>
      <div className={styles.pageHeading}><div><h2>Refresh</h2><p>Controls how often visible extension views request fresh task data.</p></div></div>
      <SettingRow title="Background updates" description="When downloads are active and the popup is closed, check about every 30 seconds for completion alerts and badge updates. Checks stop automatically when nothing is downloading. Turn off to pause checks even during downloads; opening the popup still refreshes."><Toggle checked={settings.value?.backgroundPollingEnabled ?? true} onChange={checked => updateSettings({ backgroundPollingEnabled: checked })} /></SettingRow>
      <SettingRow title="Active refresh interval" description="Used while a view is open and downloads are active. Idle views refresh at least every 15 seconds; closed views stop polling when no tasks are progressing." className={styles.selectRow}><SelectControl aria-label="Active refresh interval" value={settings.value?.pollingInterval || 3000} onChange={event => updateSettings({ pollingInterval: Number(event.currentTarget.value) })}><option value={3000}>3 seconds</option><option value={5000}>5 seconds</option><option value={10000}>10 seconds</option><option value={30000}>30 seconds</option></SelectControl></SettingRow>
    </>,
    browser: <>
      <div className={styles.pageHeading}><div><h2>Browser</h2><p>Add downloads from page links without broad, permanent website access.</p></div></div>
      <SettingRow title="Download context action" description="Show “Download with Synology DS” for links, media and selected URLs."><Toggle checked={settings.value?.contextMenuDownloadEnabled ?? settings.value?.contextMenuEnabled ?? true} onChange={checked => updateSettings({ contextMenuDownloadEnabled: checked })} /></SettingRow>
      <SettingRow title="Scrape page action" description="Show “Scrape page for downloads” separately on the page context menu."><Toggle checked={settings.value?.contextMenuScrapeEnabled ?? settings.value?.contextMenuEnabled ?? true} onChange={checked => updateSettings({ contextMenuScrapeEnabled: checked })} /></SettingRow>
    </>,
    appearance: <>
      <div className={styles.pageHeading}><div><h2>Appearance</h2><p>Choose independent presets or custom colors for light and dark mode.</p></div></div>
      <AppearanceEditor />
      <div className={styles.badgeSection}><SettingRow title="Toolbar badge" description="Choose the task count displayed on the extension icon." className={styles.selectRow}><SelectControl aria-label="Toolbar badge" value={settings.value?.badgeMode || 'active'} onChange={event => updateSettings({ badgeMode: event.currentTarget.value as 'none' | 'active' | 'downloading' | 'failed' })}><option value="active">Active tasks</option><option value="downloading">Downloading tasks</option><option value="failed">Failed tasks</option><option value="none">Hidden</option></SelectControl></SettingRow></div>
    </>,
    notifications: <>
      <div className={styles.pageHeading}><div><h2>Notifications</h2><p>Choose how the extension lets you know when a download completes.</p></div></div>
      <SettingRow title="Browser notifications" description="Your browser may ask for permission when enabled."><Toggle checked={settings.value?.notificationsEnabled ?? true} onChange={toggleNotifications} /></SettingRow>
      <SettingRow title="Completion sound" description="Play a quiet, brief chime when an existing download finishes. This works independently of browser notifications."><Toggle checked={settings.value?.completionSoundEnabled ?? true} onChange={checked => updateSettings({ completionSoundEnabled: checked })} /></SettingRow>
      <SettingRow title="Sound style" description="Choose one of six sounds. Preview it without changing your download tasks." className={styles.soundRow}><div className={styles.soundControls}><SelectControl aria-label="Completion sound" value={settings.value?.completionSound || 'soft'} onChange={event => updateSettings({ completionSound: event.currentTarget.value as CompletionSoundId })}>{completionSounds.map(sound => <option value={sound.id} key={sound.id}>{sound.label}</option>)}</SelectControl><Button variant="secondary" size="sm" icon={<Play size={14} />} onClick={previewCompletionSound} aria-label="Preview completion sound">Preview</Button></div></SettingRow>
    </>,
    data: <>
      <div className={styles.pageHeading}><div><h2>Data</h2><p>Export or restore preferences and NAS profile metadata without authentication secrets.</p></div></div>
      <SettingsBackup />
    </>,
    about: <>
      <div className={styles.pageHeading}><div><h2>About R22E Station</h2><p>A browser companion for Synology Download Station.</p></div></div>
      <div className={styles.infoCard}>
        <div className={styles.aboutIdentity}><img src="/icon-48.png" width="40" height="40" alt="" /><div><strong>Synology Download Station by R22E</strong><span>Version {browser.runtime.getManifest().version} · <a href={websiteUrl} target="_blank" rel="noopener noreferrer">Made with love by R22E</a></span></div></div>
        <p>Manage NAS download tasks from your browser, send links and task files to Download Station, and keep an eye on progress. This independent open-source project is not affiliated with Synology.</p>
      </div>
      <div className={styles.infoCard}>
        <h3>Support & contribute</h3>
        <p>Found a bug or have an idea? Open an issue. Contributions and improvements are welcome in the project repository.</p>
        <div className={styles.linkActions}><a href={`${projectUrl}/issues/new/choose`} target="_blank" rel="noopener noreferrer">Report a bug <ExternalLink size={14} /></a><a href={projectUrl} target="_blank" rel="noopener noreferrer">GitHub project <ExternalLink size={14} /></a></div>
      </div>
      <div className={styles.infoCard}>
        <h3>Availability</h3>
        <p>Install R22E Station from your browser's official add-on store.</p>
        <div className={styles.storeList}><a href={chromeStoreUrl} target="_blank" rel="noopener noreferrer">Chrome Web Store <ExternalLink size={14} aria-hidden="true" /></a><a href={edgeStoreUrl} target="_blank" rel="noopener noreferrer">Microsoft Edge Add-ons <ExternalLink size={14} aria-hidden="true" /></a><a href={firefoxStoreUrl} target="_blank" rel="noopener noreferrer">Firefox Add-ons <ExternalLink size={14} aria-hidden="true" /></a></div>
      </div>
      <div className={styles.infoCard}>
        <h3>License & privacy</h3>
        <p>© 2026 R22E Studio. Released under the MIT License, provided as-is without warranty. Use Download Station in accordance with applicable law and the terms of your NAS and browser services.</p>
        <div className={styles.linkActions}><a href={`${projectUrl}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">MIT License <ExternalLink size={14} /></a><a href={`${projectUrl}/blob/main/PRIVACY.md`} target="_blank" rel="noopener noreferrer">Privacy policy <ExternalLink size={14} /></a></div>
      </div>
    </>,
  }[section];

  return <div className={styles.settingsLayout}>
    <nav className={styles.sidebar} aria-label="Settings sections">{sections.map(item => { const Icon = item.icon; return <button className={section === item.id ? styles.navActive : ''} aria-current={section === item.id ? 'page' : undefined} aria-label={item.label} title={item.label} onClick={() => { setSection(item.id); if (item.id === 'about' || item.id === 'connection') settingsSection.value = item.id; }} key={item.id}><Icon size={16} /><span>{item.label}</span></button>; })}</nav>
    <section key={section} className={styles.content} aria-label={`${sections.find(item => item.id === section)?.label} settings`} tabIndex={0}>{content}</section>
  </div>;
}

function SettingRow({ title, description, children, className = '' }: { title: string; description: string; children: ComponentChildren; className?: string }) {
  return <div className={`${styles.settingRow} ${className}`}><div><strong>{title}</strong><span>{description}</span></div><div>{children}</div></div>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void | Promise<void> }) {
  const [displayChecked, setDisplayChecked] = useState(checked);
  useEffect(() => setDisplayChecked(checked), [checked]);
  return <label className={styles.toggle}><input type="checkbox" checked={displayChecked} onChange={event => { const next = event.currentTarget.checked; setDisplayChecked(next); void onChange(next); }} /><span /></label>;
}
