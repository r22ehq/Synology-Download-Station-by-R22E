import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '@/core/platform/messaging/message-contracts';
import type { FolderItem } from '@/core/platform/messaging/message-contracts';
import { Button } from '../Button/Button';
import { Spinner } from '../Spinner/Spinner';
import { Folder, ChevronRight } from 'lucide-preact';
import styles from './DestinationBrowser.module.css';

interface DestinationBrowserProps {
  onSelect: (path: string) => void;
  defaultDestination?: string;
}

export const DestinationBrowser = ({ onSelect, defaultDestination }: DestinationBrowserProps) => {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = async (path?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await sendMessage('destinations:list', { folderPath: path });
      setFolders(res.folders);
      if (path !== undefined) {
        setCurrentPath(path);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Permission denied or File Station unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const pathParts = currentPath.split('/').filter(Boolean);

  if (error && !folders.length) {
    return (
      <div class={styles.container}>
        <p class={styles.error}>{error}</p>
        <p class={styles.fallbackText}>You can still use the default destination or enter a path manually.</p>
        {defaultDestination && (
          <Button onClick={() => onSelect(defaultDestination)}>Use Default ({defaultDestination})</Button>
        )}
      </div>
    );
  }

  return (
    <div class={styles.container}>
      <div class={styles.breadcrumbs}>
        <Button variant="ghost" size="sm" onClick={() => fetchFolders('')} disabled={loading}>
          Root
        </Button>
        {pathParts.map((part, index) => {
          const path = '/' + pathParts.slice(0, index + 1).join('/');
          return (
            <div key={path} style={{ display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={14} />
              <Button variant="ghost" size="sm" onClick={() => fetchFolders(path)} disabled={loading}>
                {part}
              </Button>
            </div>
          );
        })}
      </div>

      <div class={styles.list}>
        {loading ? (
          <Spinner />
        ) : (
          folders.map((folder) => (
            <div key={folder.path} class={styles.folderRow}>
              <div class={styles.folderName} onClick={() => fetchFolders(folder.path)}>
                <Folder size={16} />
                <span>{folder.name}</span>
              </div>
              <Button size="sm" onClick={() => onSelect(folder.path)}>
                Select
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
