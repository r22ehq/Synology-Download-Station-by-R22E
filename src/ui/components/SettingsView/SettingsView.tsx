import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { Bell, Database, ExternalLink, Globe2, Info, Palette, Play, Plus, RefreshCw, Server, Trash2 } from 'lucide-preact';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { SelectControl } from '../SelectControl/SelectControl';
import { addProfile, activeProfileId, profiles, removeProfile, settings, setActiveProfile, updateSettings } from '../../state/app-state';
import { currentView, navigateTo, settingsSection } from '../../state/navigation';
import { testConnection } from '../../utils/connection-tester';
import { normalizeNasUrl } from '@/core/domain/connection/nas-url';
import { discoverQuickConnectEndpoints, normalizeQuickConnectId } from '@/core/domain/connection/quickconnect';
import { PermissionsManager } from '@/core/platform/browser/permissions';
import { SettingsBackup } from '../SettingsBackup/SettingsBackup';
import { AppearanceEditor } from '../AppearanceEditor/AppearanceEditor';
import { completionSounds, getCompletionSound, type CompletionSoundId } from '@/core/platform/browser/completion-sounds';
import styles from './SettingsView.module.css';

type Section = 'connection' | 'refresh' | 'browser' | 'appearance' | 'notifications' | 'data' | 'about';
const sections: Array<{ id: Section; label: string; icon: typeof Server }> = [
  { id: 'connection', label: 'Connection', icon: Server },
  { id: 'refresh', label: 'Refresh', icon: RefreshCw },
  { id: 'browser', label: 'Browser', icon: Globe2 },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'about', label: 'About', icon: Info },
];

const projectUrl = 'https://github.com/r22ehq/Synology-Download-Station-by-R22E';

const displayUrl = (profile: { protocol: string; host: string; port: number }) => `${profile.protocol}://${profile.host}:${profile.port}`;

const endpointCandidates = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(trimmed)) return [trimmed];
  if (/:(\d+)$/.test(trimmed)) return [`https://${trimmed}`];
  return [`https://${trimmed}:5001`, `http://${trimmed}:5000`];
};

export function SettingsView() {
  const isAdding = currentView.value === 'add_nas';
  const [section, setSection] = useState<Section>(settingsSection.value);
  const [url, setUrl] = useState('');
  const [connectionType, setConnectionType] = useState<'local' | 'quickconnect'>('local');
  const [quickConnectId, setQuickConnectId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  const previewCompletionSound = () => {
    const sound = getCompletionSound(settings.value?.completionSound);
    const audio = new Audio(browser.runtime.getURL(`/${sound.file}`));
    audio.volume = 0.75;
    void audio.play().catch(() => {});
  };

  const requestConnectionPermission = async (connectionUrl: string) => {
    if (await PermissionsManager.hasHostPermission(connectionUrl)) return true;
    return PermissionsManager.requestHostPermission(connectionUrl);
  };

  const resolveEndpoint = async () => {
    const diagnostics: string[] = [];
    let candidates: string[];
    if (connectionType === 'quickconnect') {
      const id = normalizeQuickConnectId(quickConnectId);
      if (!await requestConnectionPermission('https://global.quickconnect.to')) {
        throw new Error('Permission to contact Synology QuickConnect is required.');
      }
      candidates = await discoverQuickConnectEndpoints(id);
    } else {
      candidates = endpointCandidates(url);
    }
    for (const candidate of candidates) {
      const normalized = normalizeNasUrl(candidate);
      const normalizedUrl = `${normalized.protocol}://${normalized.host}:${normalized.port}`;
      if (!await requestConnectionPermission(normalizedUrl)) {
        diagnostics.push(`${normalizedUrl}: permission denied`);
        continue;
      }
      const result = await testConnection({ url: normalizedUrl, username, password });
      if (result.success) return { normalized, result };
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
      setTestResult({ success: false, msg: message === 'Failed to fetch' ? 'The NAS could not be reached. Verify the address, port, and certificate.' : message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      const normalized = connectionType === 'quickconnect'
        ? (await resolveEndpoint()).normalized
        : endpointCandidates(url).length === 1
          ? normalizeNasUrl(endpointCandidates(url)[0]!)
          : (await resolveEndpoint()).normalized;
      const normalizedUrl = `${normalized.protocol}://${normalized.host}:${normalized.port}`;
      if (!await requestConnectionPermission(normalizedUrl)) throw new Error('Host permission is required to save this NAS.');
      const newId = await addProfile({
        name: connectionType === 'quickconnect' ? normalizeQuickConnectId(quickConnectId) : normalized.host,
        protocol: normalized.protocol,
        host: normalized.host,
        port: normalized.port,
        username,
        ...(connectionType === 'quickconnect' ? { quickConnectId: normalizeQuickConnectId(quickConnectId) } : {}),
      });
      await setActiveProfile(newId);
      setUrl(''); setQuickConnectId(''); setUsername(''); setPassword(''); setTestResult(null);
      navigateTo('main');
    } catch (error) {
      setTestResult({ success: false, msg: error instanceof Error ? error.message : 'Invalid NAS address.' });
    }
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
        <div className={styles.pageHeading}><div><h2>New connection</h2><p>Connect only to a NAS you trust. Access is requested for this host only.</p></div></div>
        <div className={styles.formCard}>
          <fieldset className={styles.connectionMethods}>
            <legend>Connection method</legend>
            <label><input type="radio" name="connection-method" checked={connectionType === 'local'} onChange={() => { setConnectionType('local'); setTestResult(null); }} /><span>Local <strong>Recommended</strong><small>Use your NAS address for a reliable connection.</small></span></label>
            <label><input type="radio" name="connection-method" checked={connectionType === 'quickconnect'} onChange={() => { setConnectionType('quickconnect'); setTestResult(null); }} /><span>QuickConnect <em>Unofficial · may break</em><small>Enter just your QuickConnect ID. Direct connections only; relay is not supported.</small></span></label>
          </fieldset>
          {connectionType === 'local'
            ? <Input id="nas-url" label="NAS URL or address" helperText="Use a hostname or IP address. If omitted, HTTPS and port 5001 are used." value={url} onInput={event => setUrl(event.currentTarget.value)} placeholder="https://192.168.1.10:5001" />
            : <Input id="quickconnect-id" label="QuickConnect ID" helperText="We find and test a direct Synology address before saving. The connection may stop working if your network changes." value={quickConnectId} onInput={event => setQuickConnectId(event.currentTarget.value)} placeholder="your-quickconnect-id" />}
          <Input id="nas-username" label="Username" value={username} onInput={event => setUsername(event.currentTarget.value)} autocomplete="username" />
          <Input id="nas-password" label="Password" helperText="Used to test the connection and never stored." type="password" value={password} onInput={event => setPassword(event.currentTarget.value)} autocomplete="new-password" placeholder="Password" />
          {testResult && <div className={testResult.success ? styles.success : styles.error} role="status">{testResult.msg}</div>}
          <div className={styles.actions}>
            <Button variant="ghost" size="sm" onClick={() => navigateTo('settings')}>Cancel</Button>
            <Button variant="secondary" size="sm" onClick={handleTest} isLoading={isTesting} disabled={!(connectionType === 'local' ? url : quickConnectId) || !username}>Test connection</Button>
            <Button size="sm" onClick={handleSave} disabled={!(connectionType === 'local' ? url : quickConnectId) || !username}>Save Profile</Button>
          </div>
        </div>
      </div>
    );
  }

  const content = {
    connection: <>
      <div className={styles.pageHeading}><div><h2>Connection</h2><p>Switch profiles or add another Synology NAS.</p></div><Button size="sm" icon={<Plus size={15} />} onClick={() => navigateTo('add_nas')}>Add NAS</Button></div>
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
        <div className={styles.aboutIdentity}><img src="/icon-48.png" width="40" height="40" alt="" /><div><strong>Synology Download Station by R22E</strong><span>Version {browser.runtime.getManifest().version} · Developed by R22E Studio</span></div></div>
        <p>Manage NAS download tasks from your browser, send links and task files to Download Station, and keep an eye on progress. This independent open-source project is not affiliated with Synology.</p>
      </div>
      <div className={styles.infoCard}>
        <h3>Support & contribute</h3>
        <p>Found a bug or have an idea? Open an issue. Contributions and improvements are welcome in the project repository.</p>
        <div className={styles.linkActions}><a href={`${projectUrl}/issues/new/choose`} target="_blank" rel="noopener noreferrer">Report a bug <ExternalLink size={14} /></a><a href={projectUrl} target="_blank" rel="noopener noreferrer">GitHub project <ExternalLink size={14} /></a></div>
      </div>
      <div className={styles.infoCard}>
        <h3>Availability</h3>
        <p>Store listings will be linked here after this extension is published. Until then, use a test build from this project.</p>
        <div className={styles.storeList}><span>Chrome Web Store <small>Coming soon</small></span><span>Microsoft Edge Add-ons <small>Coming soon</small></span><span>Firefox Add-ons <small>Coming soon</small></span></div>
      </div>
      <div className={styles.infoCard}>
        <h3>License & privacy</h3>
        <p>© 2026 R22E Studio. Released under the MIT License, provided as-is without warranty. Use Download Station in accordance with applicable law and the terms of your NAS and browser services.</p>
        <div className={styles.linkActions}><a href={`${projectUrl}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">MIT License <ExternalLink size={14} /></a><a href={`${projectUrl}/blob/main/PRIVACY.md`} target="_blank" rel="noopener noreferrer">Privacy policy <ExternalLink size={14} /></a></div>
      </div>
    </>,
  }[section];

  return <div className={styles.settingsLayout}>
    <nav className={styles.sidebar} aria-label="Settings sections">{sections.map(item => { const Icon = item.icon; return <button className={section === item.id ? styles.navActive : ''} aria-current={section === item.id ? 'page' : undefined} onClick={() => { setSection(item.id); if (item.id === 'about' || item.id === 'connection') settingsSection.value = item.id; }} key={item.id}><Icon size={16} /><span>{item.label}</span></button>; })}</nav>
    <section className={styles.content}>{content}</section>
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
