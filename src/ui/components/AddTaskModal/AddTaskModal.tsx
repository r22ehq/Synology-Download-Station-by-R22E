import { useState } from 'preact/hooks';
import { ChevronRight, FileUp, Folder, Link, Magnet, X } from 'lucide-preact';
import { Button } from '../Button/Button';
import { DestinationBrowser } from '../DestinationBrowser/DestinationBrowser';
import { activeProfile } from '../../state/app-state';
import styles from './AddTaskModal.module.css';

type AddMode = 'urls' | 'magnet' | 'file';

interface AddTaskModalProps {
  onClose: () => void;
  onSubmit: (data: { urls?: string[]; file?: File; destination?: string }) => Promise<void> | void;
  isLoading?: boolean;
  error?: string;
}

export const AddTaskModal = ({ onClose, onSubmit, isLoading, error }: AddTaskModalProps) => {
  const [mode, setMode] = useState<AddMode>('urls');
  const [value, setValue] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [destination, setDestination] = useState(activeProfile.value?.defaultDestination || '');
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [destinationLoaded, setDestinationLoaded] = useState(false);
  const [validationError, setValidationError] = useState('');

  const parseUrls = () => value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  const submit = async () => {
    setValidationError('');
    if (mode === 'file') {
      if (!file) return setValidationError('Choose a .torrent or .nzb file.');
      if (!/\.(torrent|nzb)$/i.test(file.name)) return setValidationError('Only .torrent and .nzb files are supported.');
      await onSubmit({ file, destination });
      return;
    }
    const urls = parseUrls();
    if (!urls.length) return setValidationError('Enter at least one URL or magnet link.');
    if (mode === 'magnet' && urls.some(url => !url.startsWith('magnet:'))) return setValidationError('Magnet mode accepts magnet links only.');
    await onSubmit({ urls, destination });
  };

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="add-task-title">
        <header className={styles.header}>
          <div><img src="/icon-32.png" width="26" height="26" alt="" /><h2 id="add-task-title">Add download</h2></div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close"><X size={19} /></button>
        </header>

        <nav className={styles.tabs} aria-label="Download type">
          <button className={mode === 'urls' ? styles.activeTab : ''} onClick={() => setMode('urls')}><Link size={15} />URL</button>
          <button className={mode === 'magnet' ? styles.activeTab : ''} onClick={() => setMode('magnet')}><Magnet size={15} />Magnet</button>
          <button className={mode === 'file' ? styles.activeTab : ''} onClick={() => setMode('file')}><FileUp size={15} />Task file</button>
        </nav>

        <div className={styles.content}>
          {mode === 'file' ? (
            <label className={styles.dropzone}>
              <FileUp size={24} />
              <strong>{file?.name || 'Choose a .torrent or .nzb file'}</strong>
              <span>The file is sent directly to your NAS and is not stored by the extension.</span>
              <input type="file" accept=".torrent,.nzb" onChange={event => setFile(event.currentTarget.files?.[0] || null)} />
            </label>
          ) : (
            <label className={styles.field}>
              <span>{mode === 'magnet' ? 'Magnet links' : 'URLs'} <small>one per line</small></span>
              <textarea
                autoFocus
                rows={6}
                value={value}
                onInput={event => setValue(event.currentTarget.value)}
                placeholder={mode === 'magnet' ? 'magnet:?xt=urn:btih:…' : 'https://example.com/file.zip\nhttps://example.com/video.mp4'}
              />
            </label>
          )}

          <div className={styles.destination}>
            <button className={styles.destinationToggle} aria-expanded={destinationOpen} aria-controls="add-destination-panel" onClick={() => { setDestinationLoaded(true); setDestinationOpen(open => !open); }}>
              <Folder size={16} /><strong>Destination</strong><span title={destination || 'Download Station default'}>{destination || 'NAS default'}</span><ChevronRight size={16} />
            </button>
            <div id="add-destination-panel" className={`${styles.destinationPanel} ${destinationOpen ? styles.destinationOpen : ''}`} inert={!destinationOpen} aria-hidden={!destinationOpen}>
              <div className={styles.destinationInner}>{destinationLoaded && <DestinationBrowser defaultDestination={destination} onSelect={setDestination} />}</div>
            </div>
          </div>

          {(validationError || error) && <div className={styles.error} role="alert">{validationError || error}</div>}
        </div>

        <footer className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} isLoading={isLoading}>Add download</Button>
        </footer>
      </section>
    </div>
  );
};
