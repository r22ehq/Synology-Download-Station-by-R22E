import { useEffect, useState } from 'preact/hooks';
import { isReady, initAppState, activeProfile } from '../../src/ui/state/app-state';
import { Button } from '../../src/ui/components/Button/Button';
import { Input } from '../../src/ui/components/Input/Input';
import { Card } from '../../src/ui/components/Card/Card';
import { Spinner } from '../../src/ui/components/Spinner/Spinner';
import { Badge } from '../../src/ui/components/Badge/Badge';
import { sendMessage } from '../../src/core/platform/messaging/message-contracts';
import { Plus, Download, Folder, Settings } from 'lucide-preact';
import styles from './App.module.css';

import { PermissionsManager } from '../../src/core/platform/browser/permissions';
import type { DownloadTask } from '../../src/core/platform/messaging/message-contracts';

export const App = () => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [authStatus, setAuthStatus] = useState<{ status: string; profileId?: string } | null>(null);
  const [quickAddUrl, setQuickAddUrl] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [stats, setStats] = useState({ speedDownload: 0, speedUpload: 0 });
  const [otpCode, setOtpCode] = useState('');
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    initAppState();
  }, []);

  useEffect(() => {
    if (isReady.value && activeProfile.value) {
      checkAuth();
    }
  }, [isReady.value, activeProfile.value]);

  useEffect(() => {
    if (isReady.value && activeProfile.value && authStatus?.status === 'authenticated') {
      
      const refresh = () => {
        if (document.visibilityState === 'visible') {
          sendMessage('tasks:refresh_intent', {}).then(res => {
            setTasks(res.tasks || []);
            if (res.stats) {
              setStats(res.stats);
            }
          }).catch(() => {});
        }
      };

      refresh();
      const interval = setInterval(refresh, 3000);
      
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') refresh();
      };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, [isReady.value, activeProfile.value, authStatus?.status]);

  const checkAuth = async () => {
    try {
      const res = await sendMessage('auth:status', undefined);
      setAuthStatus(res);
      if (res.status === 'authenticated') {
        fetchTasksAndStats();
      }
    } catch (e) {
      console.error('Failed to check auth', e);
    }
  };

  const fetchTasksAndStats = async () => {
    try {
      setLoadingTasks(true);
      const [tasksRes, statsRes] = await Promise.all([
        sendMessage('tasks:list', {}),
        sendMessage('stats:get', undefined)
      ]);
      setTasks(tasksRes.tasks || []);
      setStats(statsRes);
    } catch (e) {
      console.error('Failed to fetch data', e);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleQuickAdd = async () => {
    const url = quickAddUrl.trim();
    if (!url) return;
    
    try {
      setAddingTask(true);

      if (url.startsWith('http') && url.includes('.torrent')) {
        const hasPermission = await PermissionsManager.hasHostPermission(url);
        if (!hasPermission) {
          const granted = await PermissionsManager.requestHostPermission(url);
          if (!granted) {
            throw new Error('Host permission is required to fetch private tracker torrents directly.');
          }
        }
      }

      await sendMessage('tasks:create', { uri: url });
      setQuickAddUrl('');
      // Refresh tasks
      fetchTasksAndStats();
    } catch (e) {
      console.error('Failed to create task', e);
    } finally {
      setAddingTask(false);
    }
  };

  if (!isReady.value) {
    return (
      <div class={styles.loading}>
        <Spinner />
      </div>
    );
  }

  if (!activeProfile.value) {
    return (
      <div class={styles.container}>
        <div class={styles.emptyState}>
          <Folder size={48} strokeWidth={1} color="var(--color-text-secondary)" />
          <h2>No NAS Configured</h2>
          <p>Please open the settings to connect your Synology NAS.</p>
          <Button onClick={() => browser.runtime.openOptionsPage()} icon={<Settings size={16} />}>
            Open Settings
          </Button>
        </div>
      </div>
    );
  }

  if (authStatus === null) {
    return (
      <div class={styles.loading}>
        <Spinner />
      </div>
    );
  }

  const submitLogin = async () => {
    if (!password) return;
    try {
      setLoggingIn(true);
      const res = await sendMessage('auth:login', { account: activeProfile.value!.username, password });
      if (res.success || res.requires2fa) {
        checkAuth();
      } else {
        setOtpError('Invalid password');
      }
    } catch (_e) {
      setOtpError('Failed to login');
    } finally {
      setLoggingIn(false);
    }
  };

  const submitOtp = async () => {
    if (!otpCode) return;
    try {
      setSubmittingOtp(true);
      setOtpError('');
      const res = await sendMessage('auth:login', { account: activeProfile.value!.username, otpCode });
      if (res.success) {
        checkAuth();
      } else {
        setOtpError('Invalid verification code');
      }
    } catch (_e) {
      setOtpError('Failed to verify OTP');
    } finally {
      setSubmittingOtp(false);
    }
  };

  if (authStatus?.status === 'unauthenticated' || authStatus?.status === 'session-expired' || authStatus?.status === 'authentication-failed' || authStatus?.status === 'invalid-credentials') {
    return (
      <div class={styles.container}>
        <div class={styles.emptyState}>
          <h2>Login Required</h2>
          <p>Please enter the password for {activeProfile.value!.username}.</p>
          <Input
            id="login-password"
            label="Password"
            type="password"
            placeholder="Password"
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
          />
          {otpError && <p style={{ color: 'red', fontSize: '12px' }}>{otpError}</p>}
          <Button onClick={submitLogin} isLoading={loggingIn} disabled={!password}>
            Login
          </Button>
        </div>
      </div>
    );
  }

  if (authStatus?.status === 'waiting-for-2fa') {
    return (
      <div class={styles.container}>
        <div class={styles.emptyState}>
          <h2>2-Step Verification</h2>
          <p>Please enter your 6-digit authenticator code.</p>
          <Input
            id="otp-code"
            label="Verification Code"
            type="text"
            placeholder="000000"
            value={otpCode}
            onInput={(e) => setOtpCode(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitOtp()}
          />
          {otpError && <p style={{ color: 'red', fontSize: '12px' }}>{otpError}</p>}
          <Button onClick={submitOtp} isLoading={submittingOtp} disabled={!otpCode}>
            Submit Code
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div class={styles.container}>
      <header class={styles.header}>
        <div class={styles.headerInfo}>
          <h1 class={styles.title}>R22E Station</h1>
          <Badge variant={authStatus?.status === 'authenticated' ? 'success' : 'error'}>
            {authStatus?.status === 'authenticated' ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        <div class={styles.headerStats} style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', gap: '8px' }}>
          <span>↓ {(stats.speedDownload / 1024).toFixed(1)} KB/s</span>
          <span>↑ {(stats.speedUpload / 1024).toFixed(1)} KB/s</span>
        </div>
        <div class={styles.headerActions}>
          <Button variant="ghost" size="sm" onClick={() => browser.runtime.openOptionsPage()}>
            <Settings size={16} />
          </Button>
        </div>
      </header>

      <main class={styles.main}>
        <div class={styles.quickAdd}>
          <Input
            placeholder="Paste URL or magnet link..."
            value={quickAddUrl}
            onInput={(e) => setQuickAddUrl(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          />
          <input 
            type="file" 
            accept=".torrent" 
            style={{ display: 'none' }} 
            id="torrent-upload"
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0];
              if (!file) return;
              try {
                setAddingTask(true);
                const arrayBuffer = await file.arrayBuffer();
                const bytes = Array.from(new Uint8Array(arrayBuffer));
                
                await sendMessage('tasks:create', {
                  fileData: { name: file.name, type: file.type, bytes },
                });
                
                await fetchTasksAndStats();
              } catch (e) {
                console.error('Failed to upload torrent:', e);
              } finally {
                setAddingTask(false);
                // Reset input
                e.currentTarget.value = '';
              }
            }}
          />
          <Button
            icon={<Folder size={16} />}
            variant="secondary"
            onClick={() => document.getElementById('torrent-upload')?.click()}
            title="Upload .torrent file"
          />
          <Button
            icon={<Plus size={16} />}
            onClick={handleQuickAdd}
            isLoading={addingTask}
            disabled={!quickAddUrl.trim()}
          >
            Add
          </Button>
        </div>

        <div class={styles.taskList}>
          {loadingTasks ? (
            <div class={styles.center}>
              <Spinner />
            </div>
          ) : tasks.length === 0 ? (
            <div class={styles.emptyState}>
              <Download size={48} strokeWidth={1} color="var(--color-text-secondary)" />
              <p>No active downloads</p>
            </div>
          ) : (
            tasks.map((t) => (
              <Card key={t.id} className={styles.taskCard}>
                {t.title}
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
