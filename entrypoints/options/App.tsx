import { useEffect } from 'preact/hooks';
import { isReady, initAppState, updateSettings } from '../../src/ui/state/app-state';
import { NasSettings } from '../../src/ui/components/NasSettings/NasSettings';
import { SettingsBackup } from '../../src/ui/components/SettingsBackup/SettingsBackup';
import styles from './App.module.css';

export const App = () => {
  useEffect(() => {
    initAppState();
  }, []);

  if (!isReady.value) {
    return <div class={styles.loading}>Loading...</div>;
  }

  return (
    <div class={styles.container}>
      <header class={styles.header}>
        <h1 class={styles.title}>{browser.i18n.getMessage('settingsTitle') || 'Settings'}</h1>
      </header>
      <main class={styles.main}>
        <section class={styles.section}>
          <h2 class={styles.sectionTitle}>
            Appearance
          </h2>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button class="r22e-btn" onClick={() => updateSettings({ theme: 'light' })}>Light</button>
            <button class="r22e-btn" onClick={() => updateSettings({ theme: 'dark' })}>Dark</button>
          </div>
        </section>

        <section class={styles.section} style={{ marginTop: '24px' }}>
          <h2 class={styles.sectionTitle}>
            {browser.i18n.getMessage('connectionTitle') || 'Connection'}
          </h2>
          <p class={styles.sectionDescription} style={{ marginBottom: '16px' }}>
            Configure your Synology NAS connection.
          </p>
          <NasSettings />
        </section>

        <section class={styles.section} style={{ marginTop: '24px' }}>
          <h2 class={styles.sectionTitle}>
            Data
          </h2>
          <p class={styles.sectionDescription} style={{ marginBottom: '16px' }}>
            Backup and restore your settings.
          </p>
          <SettingsBackup />
        </section>
      </main>
    </div>
  );
};
