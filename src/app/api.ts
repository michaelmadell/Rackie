import type { Attachment, AttachmentOwnerKind, Site } from '#shared/schema';

export type Collection = 'rooms' | 'racks' | 'devices' | 'wall-ports' | 'cables' | 'presets' | 'power-links' | 'vlans';

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${res.status} ${res.statusText}`);
  return data as T;
}

export type HistoryEntry = { label: string; at: string };
/** Most recent first. `undo[0]` is the change Undo would reverse; `redo[0]` the one Redo would reapply. */
export type History = { undo: HistoryEntry[]; redo: HistoryEntry[] };
export type Backup = { file: string; at: string; size: number };

export type CsvTable = 'racks' | 'devices' | 'cables';
export type ImportRow = { row: number; action: 'add' | 'update' | 'unchanged' | 'error'; item: string; detail?: string };
export type ImportResult = {
  rows: ImportRow[];
  counts: Record<ImportRow['action'], number>;
  ignoredColumns: string[];
  applied: boolean;
};

/** Sends CSV text. Without `apply` the server only reports what would change. */
async function importCsv(table: CsvTable, csv: string, apply: boolean): Promise<ImportResult> {
  const res = await fetch(`/api/import/${table}${apply ? '?apply=1' : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: csv,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${res.status} ${res.statusText}`);
  return data;
}

/** Uploads a file (already compressed by the browser if it's an image). */
async function uploadAttachment(ownerKind: AttachmentOwnerKind, ownerId: string, file: { blob: Blob; name: string; type: string; originalSize: number }) {
  const q = new URLSearchParams({ ownerKind, ownerId, name: file.name, type: file.type, originalSize: String(file.originalSize) });
  const res = await fetch(`/api/attachments?${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file.blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? (res.status === 413 ? 'File too large (50 MB max)' : `${res.status} ${res.statusText}`));
  return data as Attachment;
}

export const api = {
  getSite: () => request<Site>('GET', '/site'),
  create: (c: Collection, body: object) => request<{ id: string }>('POST', `/${c}`, body),
  update: (c: Collection, id: string, patch: object) => request<{ id: string }>('PATCH', `/${c}/${id}`, patch),
  remove: (c: Collection, id: string) => request<void>('DELETE', `/${c}/${id}`),

  history: () => request<History>('GET', '/history'),
  undo: (steps = 1) => request<{ undone: string[] }>('POST', '/history/undo', { steps }),
  redo: (steps = 1) => request<{ redone: string[] }>('POST', '/history/redo', { steps }),
  backups: () => request<Backup[]>('GET', '/backups'),
  backupNow: () => request<{ file: string }>('POST', '/backups', {}),
  restoreBackup: (file: string) => request<void>('POST', `/backups/${encodeURIComponent(file)}/restore`, {}),

  exportUrl: (table: CsvTable | 'schedule') => `/api/export/${table}.csv`,
  importCsv,
  numberCables: () => request<{ numbered: number }>('POST', '/cables/number', {}),

  uploadAttachment,
  uploadThumb: (id: string, blob: Blob) =>
    fetch(`/api/attachments/${id}/thumb`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: blob }),
  removeAttachment: (id: string) => request<void>('DELETE', `/attachments/${id}`),
  fileUrl: (id: string, download = false) => `/api/attachments/${id}/file${download ? '?download=1' : ''}`,
  thumbUrl: (id: string) => `/api/attachments/${id}/thumb`,
};