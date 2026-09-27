import { useMemo, useState } from 'preact/hooks';
import type { DownloadTask, TaskStatus } from '../../../core/synology/download-station/types';
import { Button } from '../Button/Button';
import { ArrowDown, ArrowUp, BrushCleaning, ChevronDown, ChevronRight, FolderOpen, Pause, Play, Plus, Trash2 } from 'lucide-preact';
import { formatBytes, formatProgress, formatSpeed } from '../../utils/format';
import { useSlidingIndicator } from '../../hooks/useSlidingIndicator';
import styles from './TaskListView.module.css';

type Filter = 'All' | 'Active' | 'Inactive' | 'Completed' | 'Downloading';

interface TaskListViewProps {
  tasks: DownloadTask[];
  search: string;
  onAction: (ids: string[], action: 'pause' | 'resume' | 'delete') => Promise<void> | void;
  onOpenFolder: (task: DownloadTask) => Promise<void> | void;
  onAdd: () => void;
  busy?: boolean;
}

const matchesFilter = (status: TaskStatus, filter: Filter) => {
  if (filter === 'Active') return ['waiting', 'downloading', 'extracting', 'hash_checking', 'seeding'].includes(status);
  if (filter === 'Inactive') return ['paused', 'error'].includes(status);
  if (filter === 'Completed') return status === 'finished';
  if (filter === 'Downloading') return status === 'downloading';
  return true;
};

const statusLabel = (status: TaskStatus) => status.replaceAll('_', ' ');

export const TaskListView = ({ tasks, search, onAction, onOpenFolder, onAdd, busy }: TaskListViewProps) => {
  const [filter, setFilter] = useState<Filter>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const { containerRef: filtersRef, indicatorStyle } = useSlidingIndicator<HTMLElement>(filter);

  const counts = useMemo(() => ({
    All: tasks.length,
    Active: tasks.filter(task => matchesFilter(task.status, 'Active')).length,
    Inactive: tasks.filter(task => matchesFilter(task.status, 'Inactive')).length,
    Completed: tasks.filter(task => matchesFilter(task.status, 'Completed')).length,
    Downloading: tasks.filter(task => matchesFilter(task.status, 'Downloading')).length,
  }), [tasks]);

  const filteredTasks = useMemo(() => tasks.filter(task => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
    return matchesFilter(task.status, filter);
  }), [tasks, filter, search]);

  const selectedTask = tasks.find(task => task.id === detailId) || null;
  const allVisibleSelected = filteredTasks.length > 0 && filteredTasks.every(task => selectedIds.has(task.id));
  const completedIds = tasks.filter(task => task.status === 'finished').map(task => task.id);

  const toggleSelected = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const runBulkAction = async (action: 'pause' | 'resume' | 'delete') => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (action === 'delete' && !confirm(`Delete ${ids.length} selected task${ids.length === 1 ? '' : 's'}?`)) return;
    await onAction(ids, action);
    if (action === 'delete') setSelectedIds(new Set());
  };

  return (
    <div className={styles.container}>
      <nav ref={filtersRef} className={styles.filters} aria-label="Task filters" role="tablist">
        <span className={styles.filterIndicator} style={indicatorStyle} aria-hidden="true" data-testid="task-filter-indicator" />
        {(Object.keys(counts) as Filter[]).map(item => (
          <button key={item} role="tab" aria-label={`${item}, ${counts[item]} tasks`} aria-selected={filter === item} data-selected={filter === item} className={filter === item ? styles.filterActive : ''} onClick={() => setFilter(item)}>
            {item}<span>{counts[item]}</span>
          </button>
        ))}
      </nav>

      <div className={styles.toolbar}>
        <Button variant="ghost" size="sm" className={`${styles.actionButton} ${styles.actionResume}`} onClick={() => runBulkAction('resume')} disabled={!selectedIds.size || busy} icon={<Play size={14} />}>Resume</Button>
        <Button variant="ghost" size="sm" className={`${styles.actionButton} ${styles.actionPause}`} onClick={() => runBulkAction('pause')} disabled={!selectedIds.size || busy} icon={<Pause size={14} />}>Pause</Button>
        <Button variant="ghost" size="sm" className={`${styles.actionButton} ${styles.actionDelete}`} onClick={() => runBulkAction('delete')} disabled={!selectedIds.size || busy} icon={<Trash2 size={14} />}>Delete</Button>
        <span className={styles.toolbarSpacer} />
        <Button variant="ghost" size="sm" className={`${styles.actionButton} ${styles.actionDelete} ${styles.actionClear}`} icon={<BrushCleaning size={14} />} aria-label="Clear completed" onClick={() => completedIds.length && confirm(`Delete ${completedIds.length} completed task${completedIds.length === 1 ? '' : 's'}?`) && onAction(completedIds, 'delete')} disabled={!completedIds.length || busy}><span className={styles.clearFull}>Clear completed</span><span className={styles.clearCompact}>Clear</span></Button>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <input
            type="checkbox"
            className={styles.checkButton}
            checked={allVisibleSelected}
            onChange={() => setSelectedIds(allVisibleSelected ? new Set() : new Set(filteredTasks.map(task => task.id)))}
            aria-label={allVisibleSelected ? 'Clear visible selection' : 'Select visible tasks'}
            title={allVisibleSelected ? 'Clear visible selection' : 'Select visible tasks'}
          />
          <span>Name</span><span>Progress</span><span>Speed</span><span>Size</span><span>Status</span><span />
        </div>

        <div className={styles.rows}>
          {filteredTasks.length === 0 ? (
            <div className={styles.empty}>
              <strong>{search ? 'No matching tasks' : 'No tasks in this view'}</strong>
              <span>{search ? 'Try a different search.' : tasks.length === 0 ? 'Add a URL, magnet, or task file to get started.' : 'Try another task filter.'}</span>
              {!search && tasks.length === 0 && <Button onClick={onAdd} icon={<Plus size={15} />}>Add download</Button>}
            </div>
          ) : filteredTasks.map(task => {
            const transfer = task.additional?.transfer;
            const progress = formatProgress(transfer?.size_downloaded || 0, task.size);
            const isSelected = selectedIds.has(task.id);
            const isExpanded = detailId === task.id;
            return (
              <div key={task.id} className={`${styles.taskGroup} ${isSelected ? styles.selected : ''}`}>
                <div className={styles.row}>
                  <input type="checkbox" className={styles.checkButton} checked={isSelected} onChange={() => toggleSelected(task.id)} aria-label={`${isSelected ? 'Deselect' : 'Select'} ${task.title}`} title={isSelected ? 'Deselect task' : 'Select task'} />
                  <button className={styles.nameCell} onClick={() => setDetailId(isExpanded ? null : task.id)} title={`${isExpanded ? 'Hide' : 'Show'} task details: ${task.title}`}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{task.title}</span>
                  </button>
                  <div className={styles.progressCell}>
                    <div><span style={{ width: `${progress}%` }} /></div><small>{Math.round(progress)}%</small>
                  </div>
                  <div className={styles.speedCell}><span><ArrowDown size={12} aria-hidden="true" />{formatSpeed(transfer?.speed_download || 0)}</span><small><ArrowUp size={12} aria-hidden="true" />{formatSpeed(transfer?.speed_upload || 0)}</small></div>
                  <span className={styles.sizeCell}>{formatBytes(task.size)}</span>
                  <span className={`${styles.status} ${styles[task.status]}`}>{statusLabel(task.status)}</span>
                  <div className={styles.rowActions}>
                    {task.status === 'finished' ? (
                      <Button variant="ghost" size="sm" className={`${styles.actionButton} ${styles.actionFolder}`} onClick={() => onOpenFolder(task)} aria-label={`Open destination folder for ${task.title}`} title="Open destination folder in File Station"><FolderOpen size={15} /></Button>
                    ) : ['downloading', 'waiting', 'seeding'].includes(task.status) ? (
                      <Button variant="ghost" size="sm" className={`${styles.actionButton} ${styles.actionPause}`} onClick={() => onAction([task.id], 'pause')} aria-label={`Pause ${task.title}`} title="Pause download"><Pause size={14} /></Button>
                    ) : (
                      <Button variant="ghost" size="sm" className={`${styles.actionButton} ${styles.actionResume}`} onClick={() => onAction([task.id], 'resume')} aria-label={`Resume ${task.title}`} title="Resume download"><Play size={14} /></Button>
                    )}
                    <Button variant="ghost" size="sm" className={`${styles.actionButton} ${styles.actionDelete}`} onClick={() => confirm(`Delete ${task.title}?`) && onAction([task.id], 'delete')} aria-label={`Delete ${task.title}`} title="Delete task"><Trash2 size={14} /></Button>
                  </div>
                </div>

                {isExpanded && selectedTask && (
                  <div className={styles.details}>
                    <section><h3>General</h3><dl><div><dt>Type</dt><dd>{selectedTask.type}</dd></div><div><dt>Destination</dt><dd>{selectedTask.additional?.detail?.destination || '—'}</dd></div><div><dt>Owner</dt><dd>{selectedTask.username || '—'}</dd></div></dl></section>
                    <section><h3>Transfer</h3><dl><div><dt>Downloaded</dt><dd>{formatBytes(transfer?.size_downloaded || 0)}</dd></div><div><dt>Uploaded</dt><dd>{formatBytes(transfer?.size_uploaded || 0)}</dd></div><div><dt>Download speed</dt><dd>{formatSpeed(transfer?.speed_download || 0)}</dd></div></dl></section>
                    {selectedTask.additional?.file?.length ? <section className={styles.files}><h3>Files</h3>{selectedTask.additional.file.map(file => <div key={file.filename}><span>{file.filename}</span><span>{formatBytes(file.size)}</span></div>)}</section> : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
