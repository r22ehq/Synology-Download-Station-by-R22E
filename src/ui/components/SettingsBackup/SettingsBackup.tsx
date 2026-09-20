import { useState } from 'preact/hooks';
import { Button } from '../Button/Button';
import { settingsStorage, profilesStorage } from '@/core/platform/storage/storage-items';
import type { AppSettings, NasProfile } from '@/core/platform/storage/storage-items';
import { notifications } from '@/core/platform/browser/notifications';

export const SettingsBackup = () => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const settings = await settingsStorage.getValue();
      const profiles = await profilesStorage.getValue();
      
      const backup = {
        version: 1,
        settings: {
          theme: settings?.theme || 'system',
        },
        profiles: (profiles || []).map(p => ({
          id: p.id,
          name: p.name,
          host: p.host,
          port: p.port,
          protocol: p.protocol,
          username: p.username,
          defaultDestination: p.defaultDestination,
        })),
      };
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `r22e-station-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notifications.show('export-success', 'Export Successful', 'Settings have been exported.');
    } catch (e) {
      console.error('Failed to export settings:', e);
      notifications.show('export-error', 'Export Failed', 'Failed to export settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    try {
      setLoading(true);
      const file = input.files[0];
      if (!file) return;
      
      const text = await file.text();
      let backup;
      
      try {
        backup = JSON.parse(text) as unknown;
      } catch {
        throw new Error('Malformed JSON');
      }
      
      if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
        throw new Error('Invalid structure');
      }
      
      const b = backup as Record<string, unknown>;
      
      if (!b.version || typeof b.version !== 'number' || b.version > 1) {
        throw new Error('Unsupported backup version');
      }
      
      const newSettings: Partial<AppSettings> = {};
      const bSettings = b.settings as Record<string, unknown>;
      if (bSettings && typeof bSettings === 'object') {
        if (['light', 'dark', 'system'].includes(bSettings.theme as string)) {
          newSettings.theme = bSettings.theme as 'light' | 'dark' | 'system';
        }
      }
      
      const newProfiles: NasProfile[] = [];
      const seenIds = new Set<string>();
      const idRegex = /^[a-zA-Z0-9-_]{1,64}$/;
      
      if (Array.isArray(b.profiles)) {
        for (const p of b.profiles) {
          if (!p || typeof p !== 'object') continue;
          if (typeof p.id !== 'string' || !idRegex.test(p.id)) {
            throw new Error('Invalid profile ID format');
          }
          if (seenIds.has(p.id)) {
            throw new Error('Duplicate profile IDs found in backup');
          }
          
          seenIds.add(p.id);
          
          newProfiles.push({
            id: p.id,
            name: typeof p.name === 'string' ? p.name : 'Unknown',
            host: typeof p.host === 'string' ? p.host : 'localhost',
            port: typeof p.port === 'number' ? p.port : 5000,
            protocol: ['http', 'https'].includes(p.protocol as string) ? p.protocol as 'http' | 'https' : 'http',
            username: typeof p.username === 'string' ? p.username : '',
            defaultDestination: typeof p.defaultDestination === 'string' ? p.defaultDestination : '',
          });
        }
      }
      
      const oldSettings = await settingsStorage.getValue();
      const oldProfiles = await profilesStorage.getValue();
      
      try {
        if (Object.keys(newSettings).length > 0) {
          await settingsStorage.setValue(newSettings as AppSettings);
        }
        if (newProfiles.length > 0) {
          await profilesStorage.setValue(newProfiles);
        }
      } catch (_writeErr) {
        await settingsStorage.setValue(oldSettings);
        await profilesStorage.setValue(oldProfiles);
        throw new Error('Atomic write failed, rolled back changes', { cause: _writeErr });
      }
      
      notifications.show('import-success', 'Import Successful', 'Settings have been restored.');
    } catch (err) {
      console.error('Failed to import settings:', err);
      notifications.show('import-error', 'Import Failed', err instanceof Error ? err.message : 'Ensure the file is valid.');
    } finally {
      setLoading(false);
      input.value = '';
    }
  };

  return (
    <div>
      <h3>Backup & Restore</h3>
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <Button onClick={handleExport} isLoading={loading}>Export Settings</Button>
        <div style={{ position: 'relative' }}>
          <Button variant="secondary" isLoading={loading}>Import Settings</Button>
          <input 
            type="file" 
            accept=".json"
            onChange={handleImport}
            disabled={loading}
            style={{ 
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
              opacity: 0, cursor: 'pointer' 
            }} 
          />
        </div>
      </div>
    </div>
  );
};
