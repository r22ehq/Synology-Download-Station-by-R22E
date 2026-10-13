import { useEffect, useRef, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { CircleAlert, Plus, Search, X } from 'lucide-preact';
import type { DownloadTask } from '@/core/synology/download-station/types';
import { sendMessage } from '@/core/platform/messaging/message-contracts';
import { sessionDataStorage, taskSnapshotStorage } from '@/core/platform/storage/storage-items';
import { PermissionsManager } from '@/core/platform/browser/permissions';
import { activeProfile, initAppState, isReady } from '../state/app-state';
import { currentView, navigateTo, type AppView } from '../state/navigation';
import { Header } from './Header/Header';
import { TaskListView } from './TaskListView/TaskListView';
import { AddTaskModal } from './AddTaskModal/AddTaskModal';
import { SettingsView } from './SettingsView/SettingsView';
import { Button } from './Button/Button';
import { Input } from './Input/Input';
import { PasswordInput } from './Input/PasswordInput';
import { fileStationFolderUrl } from '../utils/download-station-url';
import styles from './AppShell.module.css';

type AppSurface = 'popup' | 'sidepanel' | 'options';
type AuthStatus = 'loading' | 'authenticated' | 'disconnected';

interface AppShellProps {
  surface?: AppSurface;
  initialView?: AppView;
}

const toErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong.';
const authenticationRequiredMessage = 'Your NAS session ended. Log in again. To reconnect automatically next time, enable Save password on this device.';

export function AppShell({ surface = 'popup', initialView = 'main' }: AppShellProps) {
  const openAddNas = () => {
    navigateTo('add_nas');
  };
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [stats, setStats] = useState({ speedDownload: 0, speedUpload: 0 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const [quickUrl, setQuickUrl] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const [hasSavedPassword, setHasSavedPassword] = useState(false);
  const [waitingFor2fa, setWaitingFor2fa] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [refreshState, setRefreshState] = useState<'idle' | 'refreshing' | 'done'>('idle');
  const refreshResetTimer = useRef<number | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [addError, setAddError] = useState('');
  const previousView = useRef(initialView);
  const [animatedView, setAnimatedView] = useState<AppView | null>(null);

  useEffect(() => {
    if (!searchOpen || currentView.value !== 'main') return;
    const frame = window.requestAnimationFrame(() => searchInput.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [searchOpen, currentView.value]);

  const closeSearch = () => {
    setSearch('');
    setSearchOpen(false);
    document.getElementById('task-search-toggle')?.focus({ preventScroll: true });
  };

  useEffect(() => {
    navigateTo(initialView);
    void initAppState().then(async () => {
      if (surface !== 'popup') return;
      const resumeKey = 'nasSetupResumeAfterPermission';
      const data = await browser.storage.session.get(resumeKey);
      if (data[resumeKey]) {
        await browser.storage.session.remove(resumeKey);
        navigateTo('add_nas');
      }
    }).catch(error => setMessage({ tone: 'error', text: toErrorMessage(error) }));
  }, [initialView, surface]);

  useEffect(() => {
    if (previousView.current !== currentView.value) setAnimatedView(currentView.value);
    previousView.current = currentView.value;
  }, [currentView.value]);

  useEffect(() => {
    const port = browser.runtime.connect({ name: 'r22e-live-state' });
    return () => {
      port.disconnect();
      if (refreshResetTimer.current) window.clearTimeout(refreshResetTimer.current);
    };
  }, []);

  useEffect(() => taskSnapshotStorage.watch(snapshot => {
    if (snapshot.profileId !== activeProfile.value?.id) return;
    setTasks(snapshot.tasks || []);
    setStats(snapshot.stats || { speedDownload: 0, speedUpload: 0 });
    if (snapshot.error) {
      setMessage({ tone: 'error', text: snapshot.error === 'Authentication required' ? authenticationRequiredMessage : snapshot.error });
      if (snapshot.error === 'Authentication required') setAuthStatus('disconnected');
    } else {
      setMessage(current => current?.text === authenticationRequiredMessage ? null : current);
    }
  }), []);

  const refresh = async () => {
    if (!activeProfile.value || refreshState === 'refreshing') return;
    setRefreshState('refreshing');
    const minimumFeedback = new Promise(resolve => window.setTimeout(resolve, 420));
    try {
      const [result] = await Promise.all([sendMessage('tasks:refresh_intent', {}), minimumFeedback]);
      setTasks(result.tasks);
      setStats(result.stats);
      setMessage(null);
      setRefreshState('done');
      if (refreshResetTimer.current) window.clearTimeout(refreshResetTimer.current);
      refreshResetTimer.current = window.setTimeout(() => setRefreshState('idle'), 900);
    } catch (error) {
      setRefreshState('idle');
      setMessage({ tone: 'error', text: toErrorMessage(error) });
    }
  };

  useEffect(() => {
    if (!isReady.value || !activeProfile.value) {
      setAuthStatus('disconnected');
      return;
    }
    let active = true;
    let authCheck = 0;
    setAuthStatus('loading');
    const syncAuth = () => {
      const request = ++authCheck;
      void sendMessage('auth:status', undefined).then(result => {
        if (!active || request !== authCheck) return;
        const authenticated = result.status === 'authenticated';
        setWaitingFor2fa(result.status === 'waiting-for-2fa');
        setRememberDevice(Boolean(result.rememberedDevice));
        setSavePassword(Boolean(result.savedPassword));
        setHasSavedPassword(Boolean(result.savedPassword));
        setAuthStatus(authenticated ? 'authenticated' : 'disconnected');
        if (authenticated) {
          setMessage(current => current?.text === authenticationRequiredMessage ? null : current);
          refresh();
        }
      }).catch(error => {
        if (!active || request !== authCheck) return;
        setAuthStatus('disconnected');
        setMessage({ tone: 'error', text: toErrorMessage(error) });
      });
    };
    syncAuth();
    // Keep an already-open Firefox sidebar in sync with popup sign-in/out.
    const unwatch = sessionDataStorage.watch(syncAuth);
    return () => { active = false; unwatch(); };
  }, [isReady.value, activeProfile.value?.id]);

  const login = async () => {
    if (!activeProfile.value) return;
    if (!password && !hasSavedPassword && !waitingFor2fa) {
      setMessage({ tone: 'error', text: 'Enter your NAS password.' });
      return;
    }
    if (waitingFor2fa && !otpCode.trim()) {
      setMessage({ tone: 'error', text: 'Enter the one-time verification code.' });
      return;
    }
    setIsBusy(true);
    setMessage(null);
    try {
      const result = await sendMessage('auth:login', {
        account: activeProfile.value.username,
        password: password || undefined,
        otpCode: otpCode.trim() || undefined,
        rememberDevice,
        savePassword,
      });
      if (result.requires2fa) {
        setWaitingFor2fa(true);
        setMessage({ tone: 'info', text: 'Two-step verification is required. Enter the code from your authenticator.' });
      } else {
        setWaitingFor2fa(false);
        setOtpCode('');
        setPassword('');
        setHasSavedPassword(savePassword);
        setAuthStatus('authenticated');
        await refresh();
      }
    } catch (error) {
      setAuthStatus('disconnected');
      setMessage({ tone: 'error', text: toErrorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  };

  const logout = async () => {
    setIsBusy(true);
    try {
      await sendMessage('auth:logout', undefined);
      setTasks([]);
      setStats({ speedDownload: 0, speedUpload: 0 });
      setAuthStatus('disconnected');
      setMessage({ tone: 'success', text: 'Logged out from this NAS.' });
    } catch (error) {
      setMessage({ tone: 'error', text: toErrorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  };

  const createTasks = async (data: { urls?: string[]; file?: File; destination?: string }) => {
    setIsBusy(true);
    setAddError('');
    try {
      const urls = data.urls || [];
      const torrentSources = urls.filter(url => /^https?:/i.test(url) && /\.torrent(?:$|[?#])/i.test(url));
      if (!await PermissionsManager.requestHostPermissions(torrentSources)) {
        throw new Error('Permission was not granted for the selected torrent sources.');
      }
      const fileData = data.file ? {
        name: data.file.name,
        type: data.file.type || 'application/octet-stream',
        bytes: Array.from(new Uint8Array(await data.file.arrayBuffer())),
      } : undefined;
      const result = await sendMessage('tasks:create', { uris: urls, fileData, destination: data.destination });
      const failures = result.results.filter(item => !item.success);
      if (failures.length) {
        const text = failures.map(item => `${item.input}: ${item.error || 'Failed'}`).join('\n');
        setAddError(text);
        setMessage({ tone: 'error', text: `${failures.length} download${failures.length === 1 ? '' : 's'} could not be added.` });
        return;
      }
      setAddOpen(false);
      setQuickUrl('');
      setMessage({ tone: 'success', text: `${result.results.length} download${result.results.length === 1 ? '' : 's'} added.` });
      await refresh();
    } catch (error) {
      const text = toErrorMessage(error);
      setAddError(text);
      setMessage({ tone: 'error', text });
    } finally {
      setIsBusy(false);
    }
  };

  const runTaskAction = async (ids: string[], action: 'pause' | 'resume' | 'delete') => {
    setIsBusy(true);
    setMessage(null);
    try {
      const result = action === 'delete'
        ? await sendMessage('tasks:delete', { ids })
        : action === 'pause'
          ? await sendMessage('tasks:pause', { ids })
          : await sendMessage('tasks:resume', { ids });
      const failures = result.results.filter(item => !item.success);
      if (failures.length) throw new Error(failures.map(item => `${item.id}: ${item.error || 'Failed'}`).join('; '));
      setMessage({ tone: 'success', text: `${action.charAt(0).toUpperCase()}${action.slice(1)} completed for ${ids.length} task${ids.length === 1 ? '' : 's'}.` });
      await refresh();
    } catch (error) {
      setMessage({ tone: 'error', text: toErrorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  };

  const openTaskFolder = async (task: DownloadTask) => {
    const profile = activeProfile.value;
    if (!profile) return;
    try {
      const destination = task.additional?.detail?.destination || profile.defaultDestination || '';
      await browser.tabs.create({ url: fileStationFolderUrl(profile, destination) });
    } catch (error) {
      setMessage({ tone: 'error', text: toErrorMessage(error) });
    }
  };

  const mainContent = !activeProfile.value ? (
    <section className={styles.emptyState}>
      <img src="/icon-128.png" width="80" height="80" alt="" />
      <h2>No NAS Configured</h2>
      <p>Add a NAS profile to send downloads directly to Download Station.</p>
      <Button onClick={openAddNas}>Add NAS</Button>
    </section>
  ) : authStatus !== 'authenticated' ? (
    <section className={styles.loginCard}>
      <div><h2>{waitingFor2fa ? 'Two-step verification' : 'Login Required'}</h2><p>{activeProfile.value.protocol}://{activeProfile.value.host}:{activeProfile.value.port} · {activeProfile.value.username}</p></div>
      <PasswordInput id="nas-password" label="Password" helperText={hasSavedPassword ? 'A password is saved on this device. Leave this blank to use it.' : 'Used to sign in. Saved locally only if you choose below.'} value={password} onInput={event => setPassword(event.currentTarget.value)} autocomplete="current-password" placeholder={hasSavedPassword ? 'Saved on this device' : 'Password'} />
      {waitingFor2fa && <Input id="nas-otp" label="Verification code" value={otpCode} onInput={event => setOtpCode(event.currentTarget.value)} inputMode="numeric" autocomplete="one-time-code" placeholder="Verification Code" />}
      <label className={styles.checkRow}><input type="checkbox" checked={rememberDevice} onChange={event => setRememberDevice(event.currentTarget.checked)} /><span>Remember this device <small>Keeps the NAS session and device token locally. The NAS can still expire a session.</small></span></label>
      <label className={styles.checkRow}><input type="checkbox" checked={savePassword} onChange={event => setSavePassword(event.currentTarget.checked)} /><span><span className={styles.optionTitle}>Save password on this device <strong className={styles.recommended}>Recommended</strong></span><small className={styles.optionInfo}><CircleAlert size={13} aria-hidden="true" />Allows automatic sign-in when your NAS expires the session. Two-step verification may still be required. Stored only in this browser.</small></span></label>
      <Button onClick={login} isLoading={isBusy}>{waitingFor2fa ? 'Verify' : 'Login'}</Button>
    </section>
  ) : (
    <>
      <div id="task-search" className={`${styles.searchBar} ${searchOpen ? styles.searchOpen : ''}`} inert={!searchOpen} aria-hidden={!searchOpen}>
        <Input inputRef={searchInput} aria-label="Search downloads" icon={<Search size={14} aria-hidden="true" />} value={search} onInput={event => setSearch(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeSearch(); } }} placeholder="Search downloads…" endAdornment={<Button variant="ghost" size="sm" className={styles.searchClose} onClick={closeSearch} title="Close search (Esc)" aria-label="Close search"><X size={14} /></Button>} />
      </div>
      <div className={styles.quickAdd}>
        <Input aria-label="Quick-add URL or magnet link" value={quickUrl} onInput={event => setQuickUrl(event.currentTarget.value)} placeholder="Paste URL or magnet link…" onKeyDown={event => event.key === 'Enter' && (quickUrl.trim() ? createTasks({ urls: [quickUrl.trim()] }) : (setAddError(''), setAddOpen(true)))} />
        <Button icon={<Plus size={15} />} onClick={() => quickUrl.trim() ? createTasks({ urls: [quickUrl.trim()] }) : (setAddError(''), setAddOpen(true))} isLoading={isBusy} aria-label={quickUrl.trim() ? 'Add URL download' : 'Open add download form'}>Add</Button>
      </div>
      <TaskListView tasks={tasks} search={search} onAction={runTaskAction} onOpenFolder={openTaskFolder} onAdd={() => setAddOpen(true)} busy={isBusy} />
    </>
  );

  return (
    <div className={`${styles.shell} ${styles[`surface_${surface}`]}`}>
      <Header authStatus={authStatus} stats={stats} onRefresh={refresh} onToggleSearch={() => setSearchOpen(value => !value)} searchOpen={searchOpen} onLogout={logout} refreshState={refreshState} />
      {message && <div className={`${styles.notice} ${styles[message.tone]}`} role="status"><span>{message.text}</span><button onClick={() => setMessage(null)} aria-label="Dismiss message">×</button></div>}
      <main key={currentView.value} className={`${styles.main} ${currentView.value === 'settings' ? styles.settingsMain : ''} ${animatedView === currentView.value ? (currentView.value === 'main' ? styles.viewBack : styles.viewForward) : ''}`}>{currentView.value === 'main' ? mainContent : <SettingsView onAddNas={openAddNas} inActionPopup={surface === 'popup'} />}</main>
      {addOpen && <AddTaskModal onClose={() => setAddOpen(false)} onSubmit={createTasks} isLoading={isBusy} error={addError} />}
    </div>
  );
}
