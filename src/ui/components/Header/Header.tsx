import { ArrowDown, ArrowLeft, ArrowUp, Check, ExternalLink, Info, LogOut, MoreVertical, RefreshCw, Search, Settings } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { Button } from '../Button/Button';
import { Badge } from '../Badge/Badge';
import { currentView, navigateTo } from '../../state/navigation';
import { activeProfile } from '../../state/app-state';
import { formatSpeed } from '../../utils/format';
import { downloadStationUrl } from '../../utils/download-station-url';
import styles from './Header.module.css';

export interface HeaderProps {
  authStatus?: 'authenticated' | 'disconnected' | 'loading';
  stats?: { speedDownload: number; speedUpload: number };
  onRefresh?: () => void;
  onToggleSearch?: () => void;
  onLogout?: () => void;
  refreshState?: 'idle' | 'refreshing' | 'done';
}

export function Header({ authStatus, stats, onRefresh, onToggleSearch, onLogout, refreshState = 'idle' }: HeaderProps) {
  const isMain = currentView.value === 'main';
  const [menuOpen, setMenuOpen] = useState(false);
  const connected = authStatus === 'authenticated';
  const openDownloadStation = () => {
    const profile = activeProfile.value;
    if (!profile) return;
    void browser.tabs.create({ url: downloadStationUrl(profile) });
    setMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        {!isMain ? (
          <Button variant="ghost" size="sm" onClick={() => navigateTo('main')} title="Back" aria-label="Back">
            <ArrowLeft size={17} />
          </Button>
        ) : (
          <img src="/icon-32.png" width="26" height="26" alt="" className={styles.logo} />
        )}
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <h1>{isMain ? 'R22E Station' : 'Settings'}</h1>
            {isMain && activeProfile.value && authStatus && authStatus !== 'loading' && (
              <Badge variant={connected ? 'success' : 'error'}>{connected ? 'Connected' : 'Disconnected'}</Badge>
            )}
          </div>
          {isMain && activeProfile.value && (
            <div className={styles.subtitleRow}>
              <span>{activeProfile.value.name}</span>
              {connected && stats && (
                <div className={styles.speeds} aria-label="Current transfer speed">
                  <span title="Download speed"><ArrowDown size={12} aria-hidden="true" />{formatSpeed(stats.speedDownload)}</span>
                  <span title="Upload speed"><ArrowUp size={12} aria-hidden="true" />{formatSpeed(stats.speedUpload)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        {isMain && (
          <>
            <Button variant="ghost" size="sm" onClick={onToggleSearch} title="Search tasks" aria-label="Search tasks"><Search size={17} /></Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className={`${styles.refreshButton} ${refreshState === 'done' ? styles.refreshDone : ''}`}
              title={refreshState === 'refreshing' ? 'Refreshing tasks…' : refreshState === 'done' ? 'Tasks refreshed' : 'Refresh tasks'}
              aria-label={refreshState === 'refreshing' ? 'Refreshing tasks' : refreshState === 'done' ? 'Tasks refreshed' : 'Refresh tasks'}
              disabled={!connected || refreshState === 'refreshing'}
            >
              {refreshState === 'done' ? <Check size={17} /> : <RefreshCw size={17} className={refreshState === 'refreshing' ? styles.spinning : ''} />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigateTo('settings')} title="Settings" aria-label="Settings"><Settings size={17} /></Button>
            <div className={styles.menuWrap}>
              <Button variant="ghost" size="sm" onClick={() => setMenuOpen(!menuOpen)} title="More actions" aria-label="More actions"><MoreVertical size={17} /></Button>
              {menuOpen && (
                <div className={styles.menu}>
                  <button onClick={() => { setMenuOpen(false); onLogout?.(); }}><LogOut size={15} /> Log out</button>
                  <button onClick={openDownloadStation} disabled={!activeProfile.value}><ExternalLink size={15} /> Open Download Station</button>
                  <button onClick={() => { setMenuOpen(false); navigateTo('settings'); }}><Settings size={15} /> Settings</button>
                  <button onClick={() => { setMenuOpen(false); navigateTo('settings', { section: 'about' }); }}><Info size={15} /> About</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
