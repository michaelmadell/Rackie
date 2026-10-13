import { randomUUID } from 'node:crypto';
import path from 'node:path';
import express, { Router, type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import {
  AttachmentOwnerKind, CableInput, DeviceInput, PowerLinkInput, PresetInput, RackInput, RoomInput, VlanInput, WallPortInput,
  type Site,
} from '#shared/schema';
import { backup, getHistory, getSite, listBackups, mutate, redo, restore, undo } from './store/db';
import { cascade, firstFreeU, HttpError } from './store/integrity';
import { makeTracer } from '#shared/trace';
import { upgradePorts } from '#shared/legacy';
import { indexPorts } from '#shared/ports';
import { exportCsv, exportScheduleCsv, importCsv, TABLES, type Table } from './csv/importExport';
import { buildSchedule } from '#shared/schedule';
import { attachmentDir, sendFile, storeFile, storeThumb } from './attachments';

type Body = Record<string, unknown>;
type Entity = { id: string };

type Resource = {
  path: string; // URL segment, e.g. "wall-ports"
  noun: string; // for the history, e.g. "wall port"
  key: keyof Site; // collection in the database
  prefix: string; // id prefix for new items
  schema: z.ZodObject;
  /** Values filled in when a create request leaves them out. */
  defaults: (site: Site, body: Body) => Body;
};

const resources: Resource[] = [
  {
    path: 'rooms', noun: 'room', key: 'rooms', prefix: 'room', schema: RoomInput,
    // New rooms go to the right of the existing ones.
    defaults: (s) => ({
      name: 'New room',
      x: Math.max(0, ...s.rooms.map((r) => r.x + r.width + 80)),
      y: 0, width: 900, height: 1100,
    }),
  },
  {
    path: 'racks', noun: 'rack', key: 'racks', prefix: 'rack', schema: RackInput,
    defaults: (s, b) => ({
      name: 'New rack', uHeight: 42, y: 60,
      x: 30 + 400 * s.racks.filter((r) => r.roomId === b.roomId).length, // racks are 360px wide
    }),
  },
  {
    path: 'devices', noun: 'device', key: 'devices', prefix: 'dev', schema: DeviceInput,
    defaults: (s, b) => {
      const uHeight = typeof b.uHeight === 'number' ? b.uHeight : 1;
      const mounting = b.mounting === 'front' || b.mounting === 'rear' ? b.mounting : 'both';
      const twoPorts = [{ count: 2, type: 'rj45' }];
      return {
        name: 'New device', kind: 'server', uHeight, mounting,
        frontPorts: mounting === 'rear' ? [] : twoPorts,
        rearPorts: mounting === 'rear' ? twoPorts : [],
        uPosition: b.uPosition ?? firstFreeU(s, String(b.rackId), uHeight, mounting),
      };
    },
  },
  {
    path: 'wall-ports', noun: 'wall port', key: 'wallPorts', prefix: 'wp', schema: WallPortInput,
    defaults: (s, b) => {
      const room = s.rooms.find((r) => r.id === b.roomId);
      return { label: 'New port', x: 20, y: room ? room.height - 50 : 20 };
    },
  },
  {
    path: 'cables', noun: 'cable', key: 'cables', prefix: 'cable', schema: CableInput,
    defaults: () => ({ colour: '#64748b' }),
  },
  {
    path: 'power-links', noun: 'power cable', key: 'powerLinks', prefix: 'pw', schema: PowerLinkInput,
    defaults: () => ({}),
  },
  {
    path: 'vlans', noun: 'VLAN', key: 'vlans', prefix: 'vlan', schema: VlanInput,
    // Next free VLAN ID after the highest, and a colour from a palette.
    defaults: (s) => {
      const palette = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#ca8a04', '#db2777'];
      return { name: 'New VLAN', vid: Math.max(0, ...s.vlans.map((v) => v.vid)) + 10, colour: palette[s.vlans.length % palette.length] };
    },
  },
  {
    path: 'presets', noun: 'preset', key: 'presets', prefix: 'preset', schema: PresetInput,
    defaults: () => ({ name: 'New preset', kind: 'other', uHeight: 1, mounting: 'both', frontPorts: [], rearPorts: [] }),
  },
];

const list = (site: Site, key: keyof Site) => site[key] as Entity[];

function find(site: Site, r: Resource, id: string) {
  const index = list(site, r.key).findIndex((x) => x.id === id);
  if (index < 0) throw new HttpError(404, `${r.path}/${id} not found`);
  return index;
}

/**
 * Blank strings for optional fields mean "not set": they're dropped (and on PATCH,
 * the field is removed). Blank required fields are left in, so validation reports them.
 */
function splitBlanks(r: Resource, body: Body) {
  const values: Body = {};
  const blanks: string[] = [];
  for (const [key, value] of Object.entries(body)) {
    const field = r.schema.shape[key] as z.ZodType | undefined;
    if (value === '' && field?.safeParse(undefined).success) blanks.push(key);
    else values[key] = value;
  }
  return { values, blanks };
}

// ---- Describing changes for the undo history ----

/** A readable name for an item, e.g. "web-01", or a cable's two ends. */
function nameOf(site: Site, item: Record<string, unknown>): string {
  if (typeof item.vid === 'number') return `${item.vid} ${item.name}`;
  if (typeof item.psu === 'number' && typeof item.outlet === 'number') {
    const name = (id: unknown) => site.devices.find((d) => d.id === id)?.name ?? String(id);
    return `${name(item.device)} PSU ${item.psu} → ${name(item.pdu)} outlet ${item.outlet}`;
  }
  if (typeof item.name === 'string') return item.name;
  if (typeof item.label === 'string' && item.label) return item.label;
  if (typeof item.a === 'string' && typeof item.b === 'string') {
    const ports = indexPorts(site);
    const end = (id: string) => ports.get(id)?.label.split(' › ').slice(-2).join(' ') ?? id; // "web-01 eth1"
    return `${end(item.a)} ↔ ${end(item.b)}`;
  }
  return String(item.id);
}

const MOVE_KEYS = new Set(['x', 'y', 'roomId', 'rackId', 'uPosition']);
const RESIZE_KEYS = new Set(['x', 'y', 'width', 'height']);

/** "Moved", "Resized" or "Edited", depending on which fields a PATCH changes. */
function editVerb(keys: string[]) {
  if (keys.length && keys.every((k) => MOVE_KEYS.has(k))) return 'Moved';
  if (keys.length && keys.every((k) => RESIZE_KEYS.has(k))) return 'Resized';
  return 'Edited';
}

/** What else a delete removed, e.g. " (and 3 devices, 4 cables)". */
function alsoRemoved(before: Site, after: Site, self: keyof Site) {
  const nouns = { racks: 'rack', devices: 'device', wallPorts: 'wall port', cables: 'cable', powerLinks: 'power cable', attachments: 'attachment' };
  const parts = (Object.keys(nouns) as (keyof typeof nouns)[])
    .map((k) => {
      const n = before[k].length - after[k].length - (k === self ? 1 : 0);
      const noun = nouns[k];
      return n > 0 ? `${n} ${noun}${n === 1 ? '' : 's'}` : '';
    })
    .filter(Boolean);
  return parts.length ? ` (and ${parts.join(', ')})` : '';
}

export const api = Router();

api.get('/site', (_req, res) => {
  res.json(getSite());
});

for (const r of resources) {
  api.get(`/${r.path}`, (_req, res) => {
    res.json(getSite()[r.key]);
  });

  api.get(`/${r.path}/:id`, (req, res) => {
    const site = getSite();
    res.json(list(site, r.key)[find(site, r, req.params.id)]);
  });

  api.post(`/${r.path}`, async (req, res) => {
    const { values: body } = splitBlanks(r, upgradePorts(req.body ?? {}));
    const item = await mutate((item: Entity) => `Added ${r.noun} ${nameOf(getSite(), item)}`, (draft) => {
      const data = r.schema.parse({ ...r.defaults(draft, body), ...body });
      const item = { id: `${r.prefix}-${randomUUID().slice(0, 8)}`, ...data };
      list(draft, r.key).push(item);
      return item;
    });
    res.status(201).json(item);
  });

  api.patch(`/${r.path}/:id`, async (req, res) => {
    const { values, blanks } = splitBlanks(r, upgradePorts(req.body ?? {}));
    const patch = r.schema.partial().parse(values);
    const old = list(getSite(), r.key)[find(getSite(), r, req.params.id)] as Record<string, unknown>;
    const changed = [...Object.keys(patch), ...blanks].filter((k) => JSON.stringify(old[k]) !== JSON.stringify(patch[k as keyof typeof patch]));
    const renamed = changed.length === 1 && (changed[0] === 'name' || changed[0] === 'label') && patch[changed[0] as keyof typeof patch];
    const label = renamed
      ? `Renamed ${r.noun} ${nameOf(getSite(), old)} to ${renamed}`
      : r.key === 'powerLinks'
        ? `Replugged ${nameOf(getSite(), { ...old, ...patch })}` // where it goes now
        : `${editVerb(changed)} ${r.noun} ${nameOf(getSite(), old)}`;
    const item = await mutate(label, (draft) => {
      const items = list(draft, r.key);
      const i = find(draft, r, req.params.id);
      const updated: Record<string, unknown> = { ...items[i], ...patch };
      for (const key of blanks) delete updated[key]; // a blank optional field means "clear it"
      items[i] = updated as Entity;
      return items[i];
    });
    res.json(item);
  });

  api.delete(`/${r.path}/:id`, async (req, res) => {
    const before = getSite();
    const old = list(before, r.key)[find(before, r, req.params.id)] as Record<string, unknown>;
    await mutate((after: Site) => `Deleted ${r.noun} ${nameOf(before, old)}${alsoRemoved(before, after, r.key)}`, (draft) => {
      list(draft, r.key).splice(find(draft, r, req.params.id), 1);
      cascade(draft); // e.g. deleting a room removes its racks, devices and their cables
      return draft;
    });
    res.status(204).end();
  });
}

// The full path of a cable through any patch panels, from one end to the other.
api.get('/cables/:id/trace', (req, res) => {
  const path = makeTracer(getSite()).trace(req.params.id);
  if (!path) throw new HttpError(404, `cables/${req.params.id} not found`);
  res.json(path);
});

// ---- Undo history and backups ----

api.get('/history', (_req, res) => {
  res.json(getHistory());
});

// Body: { steps?: number } to undo/redo several changes at once.
const Steps = z.object({ steps: z.number().int().min(1).max(100).default(1) });

api.post('/history/undo', async (req, res) => {
  res.json({ undone: await undo(Steps.parse(req.body ?? {}).steps) });
});

api.post('/history/redo', async (req, res) => {
  res.json({ redone: await redo(Steps.parse(req.body ?? {}).steps) });
});

api.get('/backups', async (_req, res) => {
  res.json(await listBackups());
});

api.post('/backups', async (_req, res) => {
  res.status(201).json({ file: await backup() });
});

api.post('/backups/:file/restore', async (req, res) => {
  await restore(req.params.file);
  res.status(204).end();
});

// ---- Attachments ----

const ownerList = { room: 'rooms', rack: 'racks', device: 'devices', wallPort: 'wallPorts', cable: 'cables' } as const;
const ownerName = (site: Site, kind: AttachmentOwnerKind, id: string) => {
  const owner = (site[ownerList[kind]] as Entity[]).find((x) => x.id === id);
  return owner ? nameOf(site, owner as Record<string, unknown>) : undefined;
};
const findAttachment = (id: string) => {
  const a = getSite().attachments.find((x) => x.id === id);
  if (!a) throw new HttpError(404, `attachments/${id} not found`);
  return a;
};
const rawBody = (limit: string) => express.raw({ type: () => true, limit });

// POST the file as the body (Content-Type: application/octet-stream), with
// ?ownerKind=device&ownerId=…&name=…&type=<MIME type>&originalSize=<bytes before the browser compressed it>
api.post('/attachments', rawBody('50mb'), async (req, res) => {
  const q = z.object({
    ownerKind: AttachmentOwnerKind,
    ownerId: z.string().min(1),
    name: z.string().trim().min(1).max(200),
    type: z.string().max(100).default('application/octet-stream'),
    originalSize: z.coerce.number().int().min(0).optional(),
  }).parse(req.query);
  const data = req.body as Buffer;
  if (!Buffer.isBuffer(data) || data.length === 0) throw new HttpError(400, 'The file is empty');
  const owner = ownerName(getSite(), q.ownerKind, q.ownerId);
  if (!owner) throw new HttpError(404, `${q.ownerKind} ${q.ownerId} not found`);

  const id = `att-${randomUUID().slice(0, 8)}`;
  const stored = await storeFile(id, q.name, q.type || 'application/octet-stream', data);
  const attachment = await mutate(`Attached ${q.name} to ${owner}`, (draft) => {
    const a = {
      id, ownerKind: q.ownerKind, ownerId: q.ownerId, name: q.name, type: q.type || 'application/octet-stream',
      ...stored, originalSize: Math.max(q.originalSize ?? data.length, data.length), createdAt: new Date().toISOString(),
    };
    draft.attachments.push(a);
    return a;
  });
  res.status(201).json(attachment);
});

// A small preview image for an attachment (made by the browser), shown in the sidebar.
api.put('/attachments/:id/thumb', rawBody('2mb'), async (req, res) => {
  findAttachment(req.params.id);
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new HttpError(400, 'The thumbnail is empty');
  await storeThumb(req.params.id, req.body);
  res.status(204).end();
});

api.get('/attachments/:id/thumb', (req, res) => {
  const a = findAttachment(req.params.id);
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
  res.sendFile(`${a.id}.thumb.webp`, { root: path.resolve(attachmentDir) }, (err) => {
    if (err && !res.headersSent) res.redirect(`../${a.id}/file`); // no thumbnail: use the file itself
  });
});

// ?download=1 saves it instead of opening it in the browser.
api.get('/attachments/:id/file', (req, res) => {
  sendFile(res, findAttachment(req.params.id), String(req.headers['accept-encoding'] ?? ''), req.query.download === '1');
});

api.delete('/attachments/:id', async (req, res) => {
  const a = findAttachment(req.params.id);
  await mutate(`Removed ${a.name} from ${ownerName(getSite(), a.ownerKind, a.ownerId) ?? 'its owner'}`, (draft) => {
    draft.attachments = draft.attachments.filter((x) => x.id !== a.id);
  });
  res.status(204).end();
});

// ---- CSV import / export ----

function tableFrom(param: string): Table {
  const table = param.replace(/\.csv$/i, '');
  if (!TABLES.includes(table as Table)) throw new HttpError(404, `Can only import/export ${TABLES.join(', ')}`);
  return table as Table;
}

const today = () => new Date().toISOString().slice(0, 10);

// The cable schedule (one row per cable, grouped by circuit). Before /export/:table.
api.get('/export/schedule.csv', (_req, res) => {
  res.type('text/csv; charset=utf-8');
  res.attachment(`cable-schedule-${today()}.csv`);
  res.send(exportScheduleCsv(getSite()));
});

// Gives every cable without a label the next number, C001, C002…, in schedule order,
// so each one has something stable to print on its label.
api.post('/cables/number', async (_req, res) => {
  const numbered = await mutate(
    (n: number) => `Numbered ${n} unlabelled cable${n === 1 ? '' : 's'}`,
    (draft) => {
      const used = draft.cables.map((c) => /^C(\d+)$/i.exec(c.label ?? '')?.[1]).filter(Boolean).map(Number);
      let next = Math.max(0, ...used) + 1;
      let n = 0;
      for (const circuit of buildSchedule(draft)) {
        for (const { cable } of circuit.cables) {
          const c = draft.cables.find((x) => x.id === cable.id)!;
          if (!c.label) {
            c.label = `C${String(next++).padStart(3, '0')}`;
            n++;
          }
        }
      }
      return n;
    },
  );
  res.json({ numbered });
});

// GET /api/export/devices.csv (also racks.csv, cables.csv) downloads a CSV file.
api.get('/export/:table', (req, res) => {
  const table = tableFrom(req.params.table);
  res.type('text/csv; charset=utf-8');
  res.attachment(`${table}-${today()}.csv`);
  res.send(exportCsv(getSite(), table));
});

// POST the CSV text as the body. Without ?apply=1 it's a dry run that only reports
// what would change; with it, the changes are saved as a single undoable step.
api.post('/import/:table', express.text({ type: () => true, limit: '5mb' }), async (req, res) => {
  const table = tableFrom(req.params.table);
  const text = typeof req.body === 'string' ? req.body : '';
  const { site: imported, ...result } = importCsv(getSite(), table, text);
  const apply = req.query.apply === '1';
  const { add, update } = result.counts;
  if (apply && add + update > 0) {
    const parts = [add && `${add} added`, update && `${update} updated`].filter(Boolean).join(', ');
    await mutate(`Imported ${table} from CSV: ${parts}`, (draft) => {
      Object.assign(draft, imported);
    });
  }
  res.json({ ...result, applied: apply });
});

api.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} /api${req.path}` });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    const message = err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    res.status(400).json({ error: message });
  } else if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
  } else {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
api.use(errorHandler);