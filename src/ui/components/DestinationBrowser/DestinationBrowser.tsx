import { useState, useEffect, useRef } from 'preact/hooks';
import { sendMessage, type FolderItem } from '@/core/platform/messaging/message-contracts';
import { backgroundErrorMessage, readFromBackground } from '@/core/platform/messaging/background-request';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { Spinner } from '../Spinner/Spinner';
import { Folder, ChevronRight, ArrowUp, RefreshCw } from 'lucide-preact';
import styles from './DestinationBrowser.module.css';

interface DestinationBrowserProps { onSelect: (path: string) => void; defaultDestination?: string; }

export const DestinationBrowser = ({ onSelect, defaultDestination = '' }: DestinationBrowserProps) => {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [manualPath, setManualPath] = useState(defaultDestination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const fetchFolders = async (path = '') => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const res = await readFromBackground(() => sendMessage('destinations:list', { folderPath: path || undefined }));
      if (id !== requestId.current) return;
      setFolders(res.folders);
      setCurrentPath(path);
    } catch (e) {
      if (id === requestId.current) setError(backgroundErrorMessage(e, 'Folder access is unavailable.'));
    } finally { if (id === requestId.current) setLoading(false); }
  };
  useEffect(() => { void fetchFolders(); return () => { requestId.current++; }; }, []);
  useEffect(() => setManualPath(defaultDestination), [defaultDestination]);
  const pathParts = currentPath.split('/').filter(Boolean);
  const parentPath = '/' + pathParts.slice(0, -1).join('/');
  const chooseManual = () => {
    const path = manualPath.trim().replace(/\/+$/, '');
    if (!path.startsWith('/') || path === '/' || path.split('/').some(part => part === '..' || part === '.')) {
      setError('Enter a NAS folder path, such as /downloads/movies.'); return;
    }
    onSelect(path);
  };
  return <div className={styles.container}>
    <div className={styles.toolbar}>
      <nav className={styles.breadcrumbs} aria-label="NAS folder path">
        <Button variant="ghost" size="sm" onClick={() => fetchFolders()} disabled={loading}>Root</Button>
        {pathParts.map((part, index) => {
          const path = '/' + pathParts.slice(0, index + 1).join('/');
          return <span key={path}><ChevronRight size={12} aria-hidden="true" /><Button variant="ghost" size="sm" onClick={() => fetchFolders(path)} disabled={loading}>{part}</Button></span>;
        })}
      </nav>
      <Button variant="ghost" size="sm" aria-label="Parent folder" onClick={() => fetchFolders(parentPath === '/' ? '' : parentPath)} disabled={loading || !currentPath}><ArrowUp size={15} /></Button>
      <Button variant="ghost" size="sm" aria-label="Refresh folders" onClick={() => fetchFolders(currentPath)} disabled={loading}><RefreshCw size={15} /></Button>
    </div>
    {error && <div className={styles.error} role="alert">{error}</div>}
    <div className={styles.list} aria-busy={loading}>
      {loading ? <div className={styles.empty}><Spinner /><span>Loading folders…</span></div> : folders.length ? folders.map(folder =>
        <div key={folder.path} className={styles.folderRow}>
          <button className={styles.folderName} onClick={() => fetchFolders(folder.path)} aria-label={`Open ${folder.name}`}><Folder size={18} /><span>{folder.name}</span><ChevronRight size={14} /></button>
          <Button variant="secondary" size="sm" onClick={() => onSelect(folder.path)} aria-label={`Select ${folder.name}`}>Select</Button>
        </div>) : <p className={styles.empty}>{error ? 'You can use the NAS default or enter a folder path below.' : currentPath ? 'No subfolders. You can select this folder.' : 'No shared folders available.'}</p>}
    </div>
    <div className={styles.actions}>
      <Button variant="ghost" size="sm" onClick={() => onSelect('')}>Use NAS default</Button>
      {currentPath && <Button size="sm" onClick={() => onSelect(currentPath)} disabled={loading}>Use this folder</Button>}
    </div>
    <div className={styles.manual}>
      <Input id="destination-path" label="Folder path" value={manualPath} placeholder="/downloads/movies" onInput={event => setManualPath(event.currentTarget.value)} />
      <Button variant="secondary" size="sm" onClick={chooseManual} disabled={!manualPath.trim()}>Use path</Button>
    </div>
  </div>;
};
