import { useState } from 'preact/hooks';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { Card } from '../Card/Card';
import { addProfile, profiles, removeProfile } from '../../state/app-state';
import { testConnection } from '../../utils/connection-tester';
import { normalizeNasUrl } from '@/core/domain/connection/nas-url';
import styles from './NasSettings.module.css';

export const NasSettings = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  const handleTest = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await testConnection({
        url,
        username,
        password,
      });
      setTestResult({ success: res.success, msg: res.diagnostic || (res.success ? 'Success' : 'Failed') });
    } catch (e: unknown) {
      setTestResult({ success: false, msg: e instanceof Error ? e.message : 'Invalid URL' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      const normalized = normalizeNasUrl(url);
      await addProfile({
        name: normalized.host,
        protocol: normalized.protocol,
        host: normalized.host,
        port: normalized.port,
        username,
      });
      setIsAdding(false);
      setUrl('');
      setUsername('');
      setPassword('');
      setTestResult(null);
    } catch (e: unknown) {
      setTestResult({ success: false, msg: e instanceof Error ? e.message : 'Invalid URL' });
    }
  };

  return (
    <div class={styles.container}>
      <div class={styles.profileList}>
        {profiles.value.map((p) => (
          <Card key={p.id} className={styles.profileCard}>
            <div class={styles.profileInfo}>
              <strong>{p.name}</strong>
              <span>
                {p.protocol}://{p.host}:{p.port}
              </span>
              <span>User: {p.username}</span>
            </div>
            <Button variant="danger" size="sm" onClick={() => removeProfile(p.id)}>
              Remove
            </Button>
          </Card>
        ))}
      </div>

      {!isAdding ? (
        <Button onClick={() => setIsAdding(true)}>Add NAS Connection</Button>
      ) : (
        <Card className={styles.addForm}>
          <h3>New Connection</h3>
          <Input
            id="nas-url"
            label="NAS URL (e.g. https://192.168.1.10:5001)"
            value={url}
            onInput={(e) => setUrl(e.currentTarget.value)}
          />
          <Input
            id="nas-username"
            label="Username"
            value={username}
            onInput={(e) => setUsername(e.currentTarget.value)}
          />
          <Input
            id="nas-password"
            label="Password (not saved, used for testing only)"
            type="password"
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
          />

          {testResult && (
            <div class={testResult.success ? styles.success : styles.error}>{testResult.msg}</div>
          )}

          <div class={styles.actions}>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleTest} isLoading={isTesting}>
              Test
            </Button>
            <Button onClick={handleSave} disabled={!url || !username}>
              Save Profile
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
