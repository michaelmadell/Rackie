import { useEffect, useRef, useState } from 'react';
import { api, type CsvTable, type ImportResult, type ImportRow } from '../app/api';
import { useApp } from '../app/AppContext';

const tables: { table: CsvTable; label: string }[] = [
  { table: 'racks', label: 'Racks' },
  { table: 'devices', label: 'Devices' },
  { table: 'cables', label: 'Cables' },
];

const actionLabel: Record<ImportRow['action'], string> = {
  add: 'Add', update: 'Update', unchanged: 'No change', error: 'Error',
};

const summaryWord: Record<ImportRow['action'], (n: number) => string> = {
  add: () => 'to add', update: () => 'to update', unchanged: () => 'unchanged', error: (n) => (n === 1 ? 'error' : 'errors'),
};

type Pending = { table: CsvTable; fileName: string; csv: string; result?: ImportResult; error?: string };

/** Export racks, devices or cables as CSV, or import a CSV after previewing what it will change. */
export function ImportExportPanel() {
  const { run } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<CsvTable | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  function chooseFile(table: CsvTable) {
    setImporting(table);
    fileInput.current!.value = ''; // so choosing the same file again still fires onChange
    fileInput.current!.click();
  }

  async function preview(file: File) {
    if (!importing) return;
    const csv = await file.text();
    const p: Pending = { table: importing, fileName: file.name, csv };
    try {
      p.result = await api.importCsv(importing, csv, false);
    } catch (e) {
      p.error = (e as Error).message;
    }
    setPending(p);
  }

  async function apply() {
    if (!pending) return;
    const done = await run(() => api.importCsv(pending.table, pending.csv, true));
    if (done) setPending(null);
  }

  return (
    <details className="import-export">
      <summary>Import / export CSV</summary>
      <ul className="csv-tables">
        {tables.map(({ table, label }) => (
          <li key={table}>
            <span>{label}</span>
            <a className="button" href={api.exportUrl(table)} download>Export</a>
            <button onClick={() => chooseFile(table)}>Import…</button>
          </li>
        ))}
      </ul>
      <p className="hint">
        Export first to get the columns, edit in a spreadsheet, then import. Rows update the item with
        the same ID, or the same name in the same rack, and anything new is added. Nothing is deleted.
      </p>
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => e.target.files?.[0] && preview(e.target.files[0])}
      />
      {pending && <ImportDialog pending={pending} onCancel={() => setPending(null)} onApply={apply} />}
    </details>
  );
}

function ImportDialog({ pending, onCancel, onApply }: { pending: Pending; onCancel: () => void; onApply: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const r = pending.result;
  const changes = r ? r.counts.add + r.counts.update : 0;
  const rows = r?.rows.filter((row) => showUnchanged || row.action !== 'unchanged') ?? [];

  return (
    <dialog ref={dialog} className="import-dialog" onCancel={onCancel} onClose={onCancel}>
      <h2>Import {pending.table} from {pending.fileName}</h2>

      {pending.error && <div className="error" role="alert"><span>{pending.error}</span></div>}

      {r && (
        <>
          <p className="import-summary">
            {(['add', 'update', 'unchanged', 'error'] as const).map((a) => (
              <span key={a} className={`import-badge ${a}`}>{r.counts[a]} {summaryWord[a](r.counts[a])}</span>
            ))}
          </p>
          {r.ignoredColumns.length > 0 && (
            <p className="hint">Ignored columns (not recognised): {r.ignoredColumns.join(', ')}</p>
          )}
          {r.counts.unchanged > 0 && (
            <label className="import-toggle">
              <input type="checkbox" checked={showUnchanged} onChange={(e) => setShowUnchanged(e.target.checked)} />
              Show unchanged rows
            </label>
          )}
          <div className="import-table-wrap">
            <table className="import-table">
              <thead>
                <tr><th>Row</th><th>Result</th><th>Item</th><th>Details</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.row} className={`row-${row.action}`}>
                    <td>{row.row}</td>
                    <td><span className={`import-badge ${row.action}`}>{actionLabel[row.action]}</span></td>
                    <td>{row.item}</td>
                    <td>{row.detail}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="hint">Nothing to change.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="hint">
            {r.counts.error > 0 && 'Rows with errors are skipped. '}
            The import is saved as one step in History, so Undo reverses all of it.
          </p>
        </>
      )}

      <div className="dialog-buttons">
        <button onClick={() => dialog.current?.close()}>Cancel</button>
        <button
          type="submit"
          disabled={changes === 0 || busy}
          onClick={async () => {
            setBusy(true);
            await onApply();
            setBusy(false);
          }}
        >
          {changes === 0 ? 'Nothing to import' : `Import ${changes} change${changes === 1 ? '' : 's'}`}
        </button>
      </div>
    </dialog>
  );
}