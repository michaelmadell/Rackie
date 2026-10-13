import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Attachment, AttachmentOwnerKind } from '#shared/schema';
import { api } from '../app/api';
import { useApp } from '../app/AppContext';
import { formatBytes, prepareUpload } from './compress';

const isImage = (a: Attachment) => a.type.startsWith('image/');
const icon = (a: Attachment) =>
  a.type === 'application/pdf' ? 'PDF' : a.type.startsWith('text/') ? 'TXT' : a.name.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE';

const sizeNote = (a: Attachment) =>
  a.originalSize > a.size * 1.05 ? `${formatBytes(a.size)} (was ${formatBytes(a.originalSize)})` : formatBytes(a.size);

/** Photos and documents attached to the selected room, rack, device, wall port or cable. */
export function Attachments({ ownerKind, ownerId }: { ownerKind: AttachmentOwnerKind; ownerId: string }) {
  const { site, run } = useApp();
  const [status, setStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewing, setViewing] = useState<Attachment | null>(null);

  const items = site.attachments.filter((a) => a.ownerKind === ownerKind && a.ownerId === ownerId);
  const images = items.filter(isImage);
  const files = items.filter((a) => !isImage(a));

  async function upload(list: FileList | File[]) {
    const all = [...list];
    let before = 0;
    let after = 0;
    for (const [i, file] of all.entries()) {
      setStatus(`Compressing ${file.name}${all.length > 1 ? ` (${i + 1} of ${all.length})` : ''}…`);
      const prepared = await prepareUpload(file);
      setStatus(`Uploading ${prepared.name}${all.length > 1 ? ` (${i + 1} of ${all.length})` : ''}…`);
      const saved = await run(async () => {
        const a = await api.uploadAttachment(ownerKind, ownerId, prepared);
        if (prepared.thumb) await api.uploadThumb(a.id, prepared.thumb);
        return a;
      });
      if (saved) {
        before += saved.originalSize;
        after += saved.size;
      }
    }
    setStatus(before > after * 1.05 ? `Saved ${formatBytes(before - after)} (${Math.round((1 - after / before) * 100)}% smaller)` : null);
  }

  async function remove(a: Attachment) {
    if (!confirm(`Remove ${a.name}? (You can undo this.)`)) return;
    await run(() => api.removeAttachment(a.id));
  }

  return (
    <div
      className={`attachments${dragOver ? ' drag-over' : ''}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
      }}
    >
      <h3>Attachments{items.length ? ` (${items.length})` : ''}</h3>

      {images.length > 0 && (
        <ul className="attach-grid">
          {images.map((a) => (
            <li key={a.id}>
              <button className="attach-thumb" onClick={() => setViewing(a)} title={`${a.name} · ${sizeNote(a)}`}>
                <img src={api.thumbUrl(a.id)} alt={a.name} loading="lazy" />
              </button>
              <button className="attach-remove" aria-label={`Remove ${a.name}`} onClick={() => remove(a)}>×</button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="attach-files">
          {files.map((a) => (
            <li key={a.id}>
              <span className="attach-icon">{icon(a)}</span>
              <span className="attach-file-text">
                <a href={api.fileUrl(a.id)} target="_blank" rel="noreferrer">{a.name}</a>
                <span className="hint">{sizeNote(a)}</span>
              </span>
              <button className="attach-remove inline" aria-label={`Remove ${a.name}`} onClick={() => remove(a)}>×</button>
            </li>
          ))}
        </ul>
      )}

      <label className="attach-add">
        <input type="file" multiple hidden onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.target.value = ''; }} />
        <span className="button">Add photos or files…</span>
        <span className="hint">or drop them here</span>
      </label>
      {status && <p className="hint attach-status">{status}</p>}

      {viewing && <Viewer images={images} start={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

/** Full-size image viewer; ← → step through the images, Esc closes. */
function Viewer({ images, start, onClose }: { images: Attachment[]; start: Attachment; onClose: () => void }) {
  const [i, setI] = useState(Math.max(0, images.findIndex((a) => a.id === start.id)));
  const a = images[i];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((n) => (n + 1) % images.length);
      if (e.key === 'ArrowLeft') setI((n) => (n - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  if (!a) return null;
  return createPortal(
    <div className="viewer" onClick={onClose} role="dialog" aria-label={a.name}>
      <img src={api.fileUrl(a.id)} alt={a.name} onClick={(e) => e.stopPropagation()} />
      <div className="viewer-bar" onClick={(e) => e.stopPropagation()}>
        <span>{a.name} · {sizeNote(a)}{images.length > 1 ? ` · ${i + 1} of ${images.length}` : ''}</span>
        <a href={api.fileUrl(a.id)} target="_blank" rel="noreferrer">Open</a>
        <a href={api.fileUrl(a.id, true)}>Download</a>
        <button onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body,
  );
}