import { useEffect, useMemo, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { Button } from '@/ui/components/Button/Button';
import { sendMessage } from '@/core/platform/messaging/message-contracts';
import { scrapeResultsStorage } from '@/core/platform/storage/storage-items';
import type { ScrapeResource } from '@/core/platform/storage/storage-items';
import { CheckSquare, FileDown, Square } from 'lucide-preact';
import styles from './App.module.css';

export const App = () => {
  const [mode, setMode] = useState<'permission' | 'scrape'>('permission');
  const [url, setUrl] = useState('');
  const [origin, setOrigin] = useState('');
  const [resources, setResources] = useState<ScrapeResource[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextMode = params.get('mode') === 'scrape' ? 'scrape' : 'permission';
    setMode(nextMode);
    if (nextMode === 'scrape') {
      scrapeResultsStorage.getValue().then(items => {
        setResources(items);
        setSelected(new Set(items.map(item => item.id)));
      });
    } else {
      setUrl(params.get('url') || '');
      setOrigin(params.get('origin') || '');
    }
  }, []);

  const selectedResources = useMemo(
    () => resources.filter(resource => selected.has(resource.id)),
    [resources, selected],
  );

  const close = async () => {
    if (mode === 'scrape') await scrapeResultsStorage.removeValue();
    window.close();
  };

  const handleGrantAccess = async () => {
    try {
      const granted = await browser.permissions.request({ origins: [origin] });
      if (!granted) return;
      setLoading(true);
      const result = await sendMessage('tasks:create', { uri: url });
      if (result && !result.success) throw new Error(result.results[0]?.error || 'Task creation failed');
      await close();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Permission request failed');
      setLoading(false);
    }
  };

  const handleSendDirectly = async () => {
    try {
      setLoading(true);
      const result = await sendMessage('tasks:create', { uri: url, forceDirect: true });
      if (result && !result.success) throw new Error(result.results[0]?.error || 'Task creation failed');
      await close();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Task creation failed');
      setLoading(false);
    }
  };

  const handleAddSelected = async () => {
    if (selectedResources.length === 0) return;
    try {
      setLoading(true);
      setError('');
      const result = await sendMessage('tasks:create', { uris: selectedResources.map(resource => resource.url) });
      if (!result.success) {
        const failures = result.results.filter(item => !item.success);
        throw new Error(`${failures.length} of ${result.results.length} downloads could not be added.`);
      }
      await close();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Downloads could not be added');
      setLoading(false);
    }
  };

  if (mode === 'scrape') {
    const allSelected = resources.length > 0 && selected.size === resources.length;
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <img src="/icon-32.png" width="28" height="28" alt="" />
          <div>
            <h1>Page downloads</h1>
            <p>Select the resources to add to Download Station.</p>
          </div>
        </header>

        {resources.length === 0 ? (
          <div className={styles.emptyState}>
            <FileDown size={36} />
            <strong>No downloadable resources found</strong>
            <span>Try the command on a page with direct links, media, magnets, or task files.</span>
          </div>
        ) : (
          <>
            <button
              className={styles.selectAll}
              onClick={() => setSelected(allSelected ? new Set() : new Set(resources.map(item => item.id)))}
            >
              {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              {allSelected ? 'Clear selection' : 'Select all'}
              <span>{selected.size} selected</span>
            </button>
            <div className={styles.resourceList}>
              {resources.map(resource => {
                const isSelected = selected.has(resource.id);
                return (
                  <button
                    key={resource.id}
                    className={`${styles.resourceRow} ${isSelected ? styles.resourceSelected : ''}`}
                    onClick={() => {
                      const next = new Set(selected);
                      if (isSelected) next.delete(resource.id);
                      else next.add(resource.id);
                      setSelected(next);
                    }}
                  >
                    {isSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                    <span className={styles.resourceText}>
                      <strong>{resource.label}</strong>
                      <small>{resource.kind} · {resource.url}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && <div className={styles.error} role="alert">{error}</div>}
        <footer className={styles.footer}>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button onClick={handleAddSelected} disabled={selected.size === 0} isLoading={loading}>Add selected</Button>
        </footer>
      </div>
    );
  }

  if (!url || !origin) return null;
  const host = (() => {
    try {
      return new URL(origin.replace('/*', '')).hostname;
    } catch {
      return 'this site';
    }
  })();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <img src="/icon-32.png" width="28" height="28" alt="" />
        <div>
          <h1>Site access required</h1>
          <p>Allow R22E Station to fetch this task file using your signed-in browser session.</p>
        </div>
      </header>
      <div className={styles.permissionCard}>
        <strong>{host}</strong>
        <span title={url}>Torrent task file</span>
      </div>
      {error && <div className={styles.error} role="alert">{error}</div>}
      <div className={styles.actions}>
        <Button onClick={handleGrantAccess} isLoading={loading}>Grant Access</Button>
        <Button variant="secondary" onClick={handleSendDirectly} isLoading={loading}>Send URL directly anyway</Button>
        <Button variant="ghost" onClick={close}>Cancel</Button>
      </div>
      <p className={styles.warning}>Direct submission may fail when the task file requires your browser session.</p>
    </div>
  );
};
