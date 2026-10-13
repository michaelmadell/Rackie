import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { SiteSchema, type Site } from '#shared/schema';
import { upgradeSite } from '#shared/legacy';
import { HttpError, validate } from './integrity';
import { seed } from './seed';

// DB_FILE=data/site.json switches to JSON; anything else is written as YAML.
const file = path.resolve(process.env.DB_FILE ?? 'data/site.yaml');
const isJson = file.endsWith('.json');
const ext = isJson ? '.json' : '.yaml';

/** The folder holding the database file; backups/ and attachments/ live inside it. */
export const dataDir = path.dirname(file);

// Backups: a copy of the file from before the first change in any 10-minute window.
export const backupDir = path.join(dataDir, 'backups');
const BACKUP_EVERY_MS = 10 * 60 * 1000;
const KEEP_BACKUPS = 50;

// Undo history is kept in memory, so it starts empty each time the server starts.
const MAX_UNDO = 100;

let site: Site;
let lastWrite: Promise<void> = Promise.resolve();
let lastBackupAt = 0;

/** One step of history: what the change was, when, and the site as it was before it. */
type Step = { label: string; at: string; before: Site };
const undoStack: Step[] = [];
const redoStack: Step[] = [];

const parse = (text: string) => SiteSchema.parse(upgradeSite((isJson ? JSON.parse(text) : YAML.parse(text)) ?? {}));
const serialise = (s: Site) => (isJson ? JSON.stringify(s, null, 2) : YAML.stringify(s));

export async function load() {
  let text: string;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    console.log(`No database found, creating ${file} with sample data`);
    site = structuredClone(seed);
    await save();
    return;
  }
  site = parse(text);
  validate(site);
  console.log(`Loaded ${file}`);
}

export const getSite = () => site;

/** Writes go one at a time, via a temp file + rename so the file is never half-written. */
function save(): Promise<void> {
  const text = serialise(site);
  const write = lastWrite.then(async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(`${file}.tmp`, text);
    await fs.rename(`${file}.tmp`, file);
  });
  lastWrite = write.catch((err) => console.error('Failed to write database', err));
  return write;
}

/** Replaces the whole site, recording the change so it can be undone. */
async function commit(next: Site, label: string) {
  await backupIfDue();
  undoStack.push({ label, at: new Date().toISOString(), before: site });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack.length = 0; // a new change replaces anything that was undone
  site = next;
  await save();
}

/**
 * Every change goes through here: the change is applied to a copy, the copy is
 * validated, and only then does it replace the real data and get saved.
 * If the change or validation throws, nothing is modified.
 * `label` describes the change in the history, e.g. "Moved device web-01".
 */
export async function mutate<T>(label: string | ((result: T) => string), change: (draft: Site) => T): Promise<T> {
  const draft = structuredClone(site);
  const result = change(draft);
  validate(draft);
  // Saving a form without changing anything shouldn't fill the history.
  if (JSON.stringify(draft) === JSON.stringify(site)) return result;
  await commit(draft, typeof label === 'function' ? label(result) : label);
  return result;
}

// ---- Undo / redo ----

const summary = (s: Step) => ({ label: s.label, at: s.at });

/** Most recent first. */
export const getHistory = () => ({
  undo: undoStack.map(summary).reverse(),
  redo: redoStack.map(summary).reverse(),
});

/** Moves `steps` changes from one stack to the other, swapping in the saved site each time. */
async function step(from: Step[], to: Step[], steps: number, what: string) {
  if (from.length === 0) throw new HttpError(409, `Nothing to ${what}`);
  const labels: string[] = [];
  for (let i = 0; i < steps && from.length > 0; i++) {
    const s = from.pop()!;
    to.push({ label: s.label, at: s.at, before: site });
    site = s.before;
    labels.push(s.label);
  }
  await backupIfDue();
  await save();
  return labels;
}

export const undo = (steps = 1) => step(undoStack, redoStack, steps, 'undo');
export const redo = (steps = 1) => step(redoStack, undoStack, steps, 'redo');

// ---- Backups ----

const stamp = (d: Date) => d.toISOString().replace(/\.\d+Z$/, '').replace(/:/g, '-'); // Windows-safe
const BACKUP_NAME = /^site-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.(yaml|json)$/;

/** Copies the current data into backups/, then removes the oldest beyond KEEP_BACKUPS. */
export async function backup(): Promise<string> {
  await fs.mkdir(backupDir, { recursive: true });
  const name = `site-${stamp(new Date())}${ext}`;
  await fs.writeFile(path.join(backupDir, name), serialise(site));
  lastBackupAt = Date.now();

  const old = (await listBackups()).slice(KEEP_BACKUPS);
  await Promise.all(old.map((b) => fs.rm(path.join(backupDir, b.file), { force: true })));
  return name;
}

async function backupIfDue() {
  if (Date.now() - lastBackupAt < BACKUP_EVERY_MS) return;
  try {
    await backup();
  } catch (err) {
    console.error('Backup failed', err); // don't block the change itself
  }
}

/** Newest first. */
export async function listBackups() {
  let names: string[];
  try {
    names = await fs.readdir(backupDir);
  } catch {
    return [];
  }
  const files = await Promise.all(
    names.filter((n) => BACKUP_NAME.test(n)).map(async (n) => {
      const stat = await fs.stat(path.join(backupDir, n));
      return { file: n, at: stat.mtime.toISOString(), size: stat.size };
    }),
  );
  return files.sort((a, b) => b.file.localeCompare(a.file));
}

/** Replaces the site with a backup. The current data is backed up first, and the restore can be undone. */
export async function restore(name: string) {
  if (!BACKUP_NAME.test(name)) throw new HttpError(400, 'Not a backup file name');
  let text: string;
  let taken: Date;
  try {
    text = await fs.readFile(path.join(backupDir, name), 'utf8');
    taken = (await fs.stat(path.join(backupDir, name))).mtime;
  } catch {
    throw new HttpError(404, `Backup ${name} not found`);
  }
  const restored = parse(text);
  validate(restored);
  await backup();
  const when = taken.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  await commit(restored, `Restored backup from ${when}`);
}