import { useEffect, useState } from 'preact/hooks';
import { isReady, initAppState, activeProfile } from '../../src/ui/state/app-state';
import { Spinner } from '../../src/ui/components/Spinner/Spinner';
import { TaskItem } from '../../src/ui/components/TaskItem/TaskItem';
import { sendMessage } from '../../src/core/platform/messaging/message-contracts';
import { Folder } from 'lucide-preact';
import type { DownloadTask } from '../../src/core/platform/messaging/message-contracts';
import styles from './App.module.css';

export const App = () => {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAppState();
  }, []);

  useEffect(() => {
    if (isReady.value && activeProfile.value) {

      const refresh = () => {
        if (document.visibilityState === 'visible') {
          sendMessage('tasks:refresh_intent', {}).then(res => {
            setTasks(res.tasks || []);
            setLoading(false);
          }).catch(() => {
            setLoading(false);
          });
        }
      };
      
      refresh();
      const interval = setInterval(refresh, 5000); // 5s for sidepanel

      const handleVisibility = () => {
        if (document.visibilityState === 'visible') refresh();
      };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, [isReady.value, activeProfile.value]);

  const handlePause = (_id: string) => {}; // TODO
  const handleResume = (_id: string) => {}; // TODO
  const handleDelete = (_id: string) => {}; // TODO

  if (!isReady.value) {
    return <div class={styles.center}><Spinner /></div>;
  }

  if (!activeProfile.value) {
    return (
      <div class={styles.center}>
        <Folder size={48} color="var(--color-text-secondary)" />
        <p>No NAS configured</p>
      </div>
    );
  }

  return (
    <div class={styles.container}>
      <header class={styles.header}>
        <h1 class={styles.title}>R22E Station Tasks</h1>
      </header>
      <main class={styles.main}>
        {loading && tasks.length === 0 ? (
          <div class={styles.center}><Spinner /></div>
        ) : tasks.length === 0 ? (
          <div class={styles.center}><p>No active tasks</p></div>
        ) : (
          <div class={styles.taskList}>
            {tasks.map(t => (
              <TaskItem 
                key={t.id} 
                task={t} 
                onPause={handlePause} 
                onResume={handleResume} 
                onDelete={handleDelete} 
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
