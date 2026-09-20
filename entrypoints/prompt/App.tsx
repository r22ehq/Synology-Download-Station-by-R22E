import { useState, useEffect } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { Button } from '@/ui/components/Button/Button';
import { sendMessage } from '@/core/platform/messaging/message-contracts';
import styles from './App.module.css';

export const App = () => {
  const [url, setUrl] = useState('');
  const [origin, setOrigin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUrl(params.get('url') || '');
    setOrigin(params.get('origin') || '');
  }, []);

  const handleGrantAccess = async () => {
    try {
      const granted = await browser.permissions.request({ origins: [origin] });
      if (granted) {
        setLoading(true);
        // Retry the task creation as a torrent fetch
        await sendMessage('tasks:create', { uri: url });
        window.close();
      }
    } catch (e) {
      console.error('Failed to request permission', e);
    }
  };

  const handleSendDirectly = async () => {
    try {
      setLoading(true);
      // Force sending directly by skipping local fetch
      await sendMessage('tasks:create', { uri: url, forceDirect: true });
      window.close();
    } catch (e) {
      console.error('Failed to send directly', e);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    window.close();
  };

  if (!url) return null;

  return (
    <div class={styles.container}>
      <h2>Permission Required</h2>
      <p>R22E Station needs access to <strong>{new URL(origin.replace('/*', '')).hostname}</strong> to download this authenticated torrent.</p>
      
      <div class={styles.actions}>
        <Button onClick={handleGrantAccess} isLoading={loading}>Grant Access</Button>
        <Button variant="secondary" onClick={handleSendDirectly} isLoading={loading}>Send URL directly anyway</Button>
        <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
      </div>
      
      <p class={styles.warning}>
        Note: Sending the URL directly to the NAS may fail if the tracker requires your browser's login session.
      </p>
    </div>
  );
};
