import type { FunctionComponent } from 'preact';
import styles from './TaskItem.module.css';
import type { DownloadTask } from '@/core/platform/messaging/message-contracts';
import { Play, Pause, X } from 'lucide-preact';
import { Button } from '../Button/Button';
import { Badge } from '../Badge/Badge';

interface TaskItemProps {
  task: DownloadTask;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const TaskItem: FunctionComponent<TaskItemProps> = ({ task, onPause, onResume, onDelete }) => {
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'downloading':
      case 'extracting': return 'success';
      case 'paused': return 'info';
      case 'error': return 'error';
      case 'finished': return 'success';
      default: return 'info';
    }
  };

  const isPausable = task.status === 'downloading' || task.status === 'waiting';
  const isResumable = task.status === 'paused' || task.status === 'error';

  return (
    <div class={styles.taskItem}>
      <div class={styles.header}>
        <div class={styles.title} title={task.title}>{task.title}</div>
        <Badge variant={getStatusColor(task.status) as 'info' | 'success' | 'warning' | 'error'}>{task.status}</Badge>
      </div>
      
      <div class={styles.progressContainer}>
        <div class={styles.progressBar}>
          <div 
            class={styles.progressFill} 
            style={{ width: `${Math.max(0, Math.min(100, task.progress))}%`, backgroundColor: task.status === 'error' ? 'var(--color-danger)' : 'var(--color-primary)' }}
          />
        </div>
        <div class={styles.progressText}>{task.progress.toFixed(1)}%</div>
      </div>
      
      <div class={styles.details}>
        <div class={styles.metrics}>
          <span>{formatBytes(task.size)}</span>
          {task.status === 'downloading' && (
            <>
              <span class={styles.dot}>•</span>
              <span>{formatBytes(task.speed)}/s</span>
            </>
          )}
        </div>
        <div class={styles.actions}>
          {isPausable && onPause && (
            <Button variant="ghost" size="sm" onClick={() => onPause(task.id)} title="Pause">
              <Pause size={14} />
            </Button>
          )}
          {isResumable && onResume && (
            <Button variant="ghost" size="sm" onClick={() => onResume(task.id)} title="Resume">
              <Play size={14} />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)} title="Delete">
              <X size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
