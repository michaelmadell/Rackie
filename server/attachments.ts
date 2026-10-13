// Storing attached files. Images arrive already re-encoded (WebP) by the browser;
// anything else that compresses well is stored brotli-compressed. Files are only
// deleted by the clean-up at startup, once nothing (not even a backup) refers to them,
// so removing an attachment can be undone.
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import type { Response } from 'express';
import type { Attachment } from '#shared/schema';
import { backupDir, dataDir, getSite } from './store/db';

export const attachmentDir = path.join(dataDir, 'attachments');
const brotli = promisify(zlib.brotliCompress);

// Already compressed: compressing again gains nothing.
const PRECOMPRESSED = /^(image\/(jpeg|png|webp|gif|avif|heic|heif)|video\/|audio\/|application\/(zip|gzip|x-7z-compressed|x-rar-compressed|vnd\.openxmlformats))/;

const safeExt = (name: string) => (path.extname(name).toLowerCase().match(/^\.[a-z0-9]{1,8}$/)?.[0] ?? '');
export const thumbFile = (id: string) => `${id}.thumb.webp`;

/** Writes an uploaded file, compressing it if that saves at least 10%. Returns what to record. */
export async function storeFile(id: string, name: string, type: string, data: Buffer) {
  await fs.mkdir(attachmentDir, { recursive: true });
  let stored = data;
  let encoding: 'br' | undefined;
  if (!PRECOMPRESSED.test(type) && data.length > 1024) {
    const packed = await brotli(data, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length },
    });
    if (packed.length < data.length * 0.9) {
      stored = packed;
      encoding = 'br';
    }
  }
  const file = `${id}${encoding ? '.br' : safeExt(name)}`;
  await fs.writeFile(path.join(attachmentDir, file), stored);
  return { file, encoding, size: stored.length };
}

export async function storeThumb(id: string, data: Buffer) {
  await fs.mkdir(attachmentDir, { recursive: true });
  await fs.writeFile(path.join(attachmentDir, thumbFile(id)), data);
}

/** Sends a stored file, decompressing it on the way if the browser can't take brotli. */
export function sendFile(res: Response, a: Attachment, acceptEncoding: string, download: boolean) {
  res.setHeader('Content-Type', a.type);
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(a.name)}`);
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable'); // an id's file never changes
  res.setHeader('Vary', 'Accept-Encoding');
  const stream = createReadStream(path.join(attachmentDir, a.file));
  stream.on('error', () => res.status(404).end());
  if (a.encoding === 'br' && /\bbr\b/.test(acceptEncoding)) {
    res.setHeader('Content-Encoding', 'br');
    stream.pipe(res);
  } else if (a.encoding === 'br') {
    stream.pipe(zlib.createBrotliDecompress()).pipe(res);
  } else {
    stream.pipe(res);
  }
}

/** Deletes stored files that neither the current data nor any backup refers to. */
export async function cleanUpAttachments() {
  let files: string[];
  try {
    files = await fs.readdir(attachmentDir);
  } catch {
    return; // no attachments yet
  }
  const ids = new Set(getSite().attachments.map((a) => a.id));
  // Backups are YAML/JSON text, so an attachment id appearing anywhere in one keeps its file.
  try {
    for (const b of await fs.readdir(backupDir)) {
      const text = await fs.readFile(path.join(backupDir, b), 'utf8');
      for (const m of text.matchAll(/att-[0-9a-f]{8}/g)) ids.add(m[0]);
    }
  } catch {
    // no backups yet
  }
  const unused = files.filter((f) => !ids.has(f.split('.')[0]));
  await Promise.all(unused.map((f) => fs.rm(path.join(attachmentDir, f), { force: true })));
  if (unused.length) console.log(`Removed ${unused.length} unused attachment file${unused.length === 1 ? '' : 's'}`);
}