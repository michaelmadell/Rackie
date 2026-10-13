import { useCallback, useEffect, useState } from 'react';
import { api, type Backup } from '../app/api';
import { useApp } from '../app/AppContext';

/** "19:17" today, "8 Oct 19:17" before that. */
function when(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? time
    : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${time}`;
}

/** Undo / redo, by any number of steps, reloading the site afterwards. */
function useUndo() {
  const { history, run } = useApp();
  const undo = useCallback((steps = 1) => run(() => api.undo(steps)), [run]);
  const redo = useCallback((steps = 1) => run(() => api.redo(steps)), [run]);
  return { history, undo, redo, canUndo: history.undo.length > 0, canRedo: history.redo.length > 0 };
}

/** The ↶ ↷ buttons in the sidebar header, plus Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z. */
export function UndoButtons() {
  const { history, undo, redo, canUndo, canRedo } = useUndo();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      // In a text box, leave Ctrl+Z to undo the typing instead.
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, canUndo, canRedo]);

  return (
    <div className="undo-buttons">
      <button className="icon" disabled={!canUndo} onClick={() => undo()} aria-label="Undo"
        title={canUndo ? `Undo: ${history.undo[0].label} (Ctrl+Z)` : 'Nothing to undo'}>↶</button>
      <button className="icon" disabled={!canRedo} onClick={() => redo()} aria-label="Redo"
        title={canRedo ? `Redo: ${history.redo[0].label} (Ctrl+Y)` : 'Nothing to redo'}>↷</button>
    </div>
  );
}

/**
 * The list of changes made since the server started, newest at the top. Clicking a
 * change goes back (or forward) to just after it. Undone changes stay listed, greyed,
 * until something new is changed.
 */
export function HistoryPanel() {
  const { history, undo, redo } = useUndo();
  const { run } = useApp();
  const [open, setOpen] = useState(false);
  const [backups, setBackups] = useState<Backup[] | null>(null);

  const loadBackups = useCallback(() => api.backups().then(setBackups).catch(() => setBackups([])), []);
  useEffect(() => {
    if (open) loadBackups();
  }, [open, history, loadBackups]); // history changes can create a backup

  async function restore(b: Backup) {
    if (!confirm(`Replace everything with the backup from ${when(b.at)}?\n\nThe current data is backed up first, and you can undo this.`)) return;
    await run(() => api.restoreBackup(b.file));
  }

  return (
    <details className="history" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>History{history.undo.length > 0 ? ` (${history.undo.length})` : ''}</summary>

      <ol className="history-list">
        {/* Undone changes, furthest first, so the list reads newest → oldest. */}
        {[...history.redo].reverse().map((h, i, all) => (
          <li key={`r${h.at}${i}`} className="undone">
            <button className="history-item" title="Redo up to here" onClick={() => redo(all.length - i)}>
              <span className="history-label">{h.label}</span>
              <span className="history-time">{when(h.at)}</span>
            </button>
          </li>
        ))}
        {history.undo.map((h, i) => (
          <li key={`u${h.at}${i}`} className={i === 0 ? 'current' : ''}>
            <button className="history-item" disabled={i === 0} title={i === 0 ? 'Latest change' : 'Undo back to here'}
              onClick={() => undo(i)}>
              <span className="history-label">{h.label}</span>
              <span className="history-time">{when(h.at)}</span>
            </button>
          </li>
        ))}
        <li className={history.undo.length === 0 ? 'current' : ''}>
          <button className="history-item" disabled={history.undo.length === 0}
            title="Undo every change listed" onClick={() => undo(history.undo.length)}>
            <span className="history-label">Start of session</span>
          </button>
        </li>
      </ol>
      <p className="hint">Undo history is cleared when the server restarts. Backups are kept.</p>

      <div className="backups-head">
        <h3>Backups</h3>
        <button onClick={() => run(() => api.backupNow())}>Back up now</button>
      </div>
      {backups?.length === 0 && <p className="hint">None yet. A backup is saved before the first change in any 10 minutes.</p>}
      <ul className="backup-list">
        {backups?.map((b) => (
          <li key={b.file}>
            <span title={b.file}>{when(b.at)}</span>
            <span className="backup-size">{(b.size / 1024).toFixed(1)} KB</span>
            <button className="link" onClick={() => restore(b)}>Restore</button>
          </li>
        ))}
      </ul>
    </details>
  );
}