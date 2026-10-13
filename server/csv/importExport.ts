// CSV import and export of racks, devices and cables.
//
// Exports have one row per item with an ID column. On import, each row updates the
// item with that ID, or (with no ID, or an unknown one) the item it matches by name:
//   racks:   room + name          devices: rack + name          cables: the same two ends
// and anything unmatched is added. Nothing is ever deleted by an import.
//
// A column that's missing leaves that field alone. A blank cell clears optional
// details (serial, notes, ports…) but leaves required fields (name, height…) as they are.
import { z } from 'zod';
import type { Cable, Device, Rack, Site } from '#shared/schema';
import { CableInput, DeviceInput, DeviceKind, Mounting, RackInput, RoomInput } from '#shared/schema';
import { PortType, type PortGroup } from '#shared/portGroups';
import { indexPorts } from '#shared/ports';
import { parseCsv, toCsv } from './csv';
import { firstFreeU, HttpError, validate } from '../store/integrity';
import { randomUUID } from 'node:crypto';
import { buildSchedule, endName } from '#shared/schedule';

export const TABLES = ['racks', 'devices', 'cables'] as const;
export type Table = (typeof TABLES)[number];

type Column = { key: string; header: string; aliases?: string[]; importOnly?: boolean };

const columns: Record<Table, Column[]> = {
  racks: [
    { key: 'id', header: 'ID' },
    { key: 'room', header: 'Room' },
    { key: 'name', header: 'Name', aliases: ['rack'] },
    { key: 'height', header: 'Height (U)', aliases: ['height', 'u', 'size'] },
  ],
  devices: [
    { key: 'id', header: 'ID' },
    { key: 'room', header: 'Room' },
    { key: 'rack', header: 'Rack' },
    { key: 'name', header: 'Name', aliases: ['device', 'hostname'] },
    { key: 'u', header: 'Bottom U', aliases: ['u', 'position', 'uposition', 'startu'] },
    { key: 'height', header: 'Height (U)', aliases: ['height', 'size'] },
    { key: 'type', header: 'Type', aliases: ['kind'] },
    { key: 'mounting', header: 'Mounting', aliases: ['mounted', 'face'] },
    { key: 'manufacturer', header: 'Manufacturer', aliases: ['make', 'vendor'] },
    { key: 'model', header: 'Model' },
    { key: 'frontPorts', header: 'Front ports', aliases: ['ports', 'front'] },
    { key: 'rearPorts', header: 'Rear ports', aliases: ['rear'] },
    { key: 'serial', header: 'Serial', aliases: ['serialnumber', 'sn'] },
    { key: 'assetTag', header: 'Asset tag', aliases: ['asset'] },
    { key: 'ip', header: 'IP', aliases: ['managementip', 'mgmtip', 'ipaddress'] },
    { key: 'notes', header: 'Notes', aliases: ['comments', 'description'] },
    { key: 'preset', header: 'Preset', aliases: ['template'], importOnly: true },
    { key: 'psus', header: 'PSUs', aliases: ['powersupplies'] },
    { key: 'powerDraw', header: 'Power (W)', aliases: ['power', 'draw', 'watts'] },
    { key: 'outlets', header: 'Outlets' },
    { key: 'feed', header: 'Feed' },
    { key: 'capacity', header: 'Capacity (W)', aliases: ['capacity'] }
  ],
  cables: [
    { key: 'id', header: 'ID' },
    { key: 'a', header: 'From', aliases: ['a', 'enda', 'sidea', 'source'] },
    { key: 'b', header: 'To', aliases: ['b', 'endb', 'sideb', 'target'] },
    { key: 'label', header: 'Label' },
    { key: 'type', header: 'Type', aliases: ['cabletype'] },
    { key: 'colour', header: 'Colour', aliases: ['color'] },
    { key: 'routing', header: 'Routing' },
  ],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// ---- Port groups as text: "48 rj45 Gi1/0/{n} + 4 sfp Te1/1/{n}" ----

const typeWords: [string, PortType][] = [
  ['fibre lc', 'lc'], ['fiber lc', 'lc'], ['sfp/sfp+', 'sfp'], ['sfp28', 'sfp'], ['sfp+', 'sfp'], ['sfp', 'sfp'],
  ['qsfp28', 'qsfp'], ['qsfp+', 'qsfp'], ['qsfp', 'qsfp'], ['rj-45', 'rj45'], ['rj45', 'rj45'], ['copper', 'rj45'],
  ['lc', 'lc'], ['fibre', 'lc'], ['fiber', 'lc'], ['console', 'console'], ['other', 'other'],
];

export const formatPorts = (groups: PortGroup[]) =>
  groups.map((g) => `${g.count} ${g.type}${g.name ? ` ${g.name}` : ''}`).join(' + ');

export function parsePorts(text: string): PortGroup[] {
  if (!text.trim() || /^(none|-)$/i.test(text.trim())) return [];
  return text.split(/\s\+\s/).map((part) => {
    const m = part.trim().match(/^(\d+)\s*[x×]?\s*(.*)$/i);
    if (!m) throw new Error(`"${part.trim()}" should start with a number of ports, e.g. "24 rj45"`);
    const rest = m[2].trim();
    const word = typeWords.find(([w]) => rest.toLowerCase() === w || rest.toLowerCase().startsWith(`${w} `));
    if (!word) throw new Error(`Unknown port type in "${part.trim()}" (use ${PortType.options.join(', ')})`);
    const name = rest.slice(word[0].length).trim().replace(/^"(.*)"$/, '$1');
    return { count: Number(m[1]), type: word[1], ...(name ? { name } : {}) };
  });
}

// ---- Export ----

function rackLookup(site: Site) {
  const rooms = new Map(site.rooms.map((r) => [r.id, r.name]));
  const racks = new Map(site.racks.map((r) => [r.id, r]));
  return (rackId: string) => {
    const rack = racks.get(rackId);
    return { room: rack ? rooms.get(rack.roomId) ?? '' : '', rack: rack?.name ?? '' };
  };
}

export function exportCsv(site: Site, table: Table): string {
  const header = columns[table].filter((c) => !c.importOnly).map((c) => c.header);
  const rooms = new Map(site.rooms.map((r) => [r.id, r.name]));

  if (table === 'racks') {
    return toCsv([header, ...site.racks.map((r) => [r.id, rooms.get(r.roomId), r.name, r.uHeight])]);
  }

  if (table === 'devices') {
    const where = rackLookup(site);
    const sorted = [...site.devices].sort((a, b) => {
      const wa = where(a.rackId), wb = where(b.rackId);
      return wa.room.localeCompare(wb.room) || wa.rack.localeCompare(wb.rack) || b.uPosition - a.uPosition;
    });
    return toCsv([
      header,
      ...sorted.map((d) => {
        const w = where(d.rackId);
        return [
          d.id, w.room, w.rack, d.name, d.uPosition, d.uHeight, d.kind, d.mounting ?? 'both', d.manufacturer, d.model,
          formatPorts(d.frontPorts), formatPorts(d.rearPorts), d.serial, d.assetTag, d.ip, d.notes,
          d.psus, d.powerDraw, d.outlets, d.feed, d.capacity,
        ];
      }),
    ]);
  }

  const ports = indexPorts(site);
  return toCsv([
    header,
    ...site.cables.map((c) => [
      c.id, ports.get(c.a)?.label ?? c.a, ports.get(c.b)?.label ?? c.b, c.label, c.type, c.colour, c.routing ?? 'bundled',
    ]),
  ]);
}

/**
 * The cable schedule as CSV: one row per cable, grouped by circuit. From / To are the
 * same port labels as the cables export, so this file can also be imported as cables.
 */
export function exportScheduleCsv(site: Site): string {
  const rows: (string | number | undefined)[][] = [[
    'Circuit', 'Cable', 'From', 'From U', 'To', 'To U', 'Type', 'Colour', 'Circuit from', 'Circuit to', 'Patch panels',
  ]];
  for (const c of buildSchedule(site)) {
    for (const x of c.cables) {
      rows.push([
        c.number, x.id, x.a.port.label, x.a.u, x.b.port.label, x.b.u, x.cable.type, x.cable.colour,
        `${c.start.room} › ${endName(c.start)}`, `${c.end.room} › ${endName(c.end)}`, c.panels,
      ]);
    }
  }
  return toCsv(rows);
}

// ---- Import ----

export type RowResult = {
  row: number; // spreadsheet row (the header is row 1)
  action: 'add' | 'update' | 'unchanged' | 'error';
  item: string;
  detail?: string;
};

export type ImportResult = {
  rows: RowResult[];
  counts: Record<RowResult['action'], number>;
  ignoredColumns: string[];
};

type Cells = { get: (key: string) => string | undefined; has: (key: string) => boolean };

function message(err: unknown) {
  if (err instanceof z.ZodError) return err.issues.map((i) => `${i.path.join('.') || 'value'}: ${i.message}`).join('; ');
  return err instanceof Error ? err.message : String(err);
}

const toInt = (label: string, v: string) => {
  if (!/^\d+$/.test(v)) throw new Error(`${label} must be a whole number, not "${v}"`);
  return Number(v);
};

/** Fields that differ, for the preview, e.g. "Bottom U 5 → 7, serial". */
function diff(before: object, after: object, names: Record<string, string> = {}) {
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  return [...new Set([...Object.keys(b), ...Object.keys(a)])]
    .filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]))
    .map((k) => {
      const name = names[k] ?? k;
      const simple = (v: unknown) => typeof v === 'number' || (typeof v === 'string' && v.length <= 20);
      return simple(b[k]) && simple(a[k]) ? `${name} ${b[k]} → ${a[k]}` : name;
    })
    .join(', ');
}

/** Sets or clears optional text fields from cells that are present. */
function setOptional(target: Record<string, unknown>, cells: Cells, keys: string[]) {
  for (const k of keys) {
    if (!cells.has(k)) continue;
    const v = cells.get(k)!;
    if (v) target[k] = v;
    else delete target[k];
  }
}

function findRoom(site: Site, name: string) {
  return site.rooms.find((r) => same(r.name, name));
}

/** The rack named in a row, using the room to tell apart racks with the same name. */
function findRack(site: Site, rackName: string, roomName?: string): Rack {
  let racks = site.racks.filter((r) => same(r.name, rackName));
  if (roomName) {
    const room = findRoom(site, roomName);
    if (!room) throw new Error(`No room named "${roomName}"`);
    racks = racks.filter((r) => r.roomId === room.id);
  }
  if (racks.length === 0) throw new Error(`No rack named "${rackName}"${roomName ? ` in ${roomName}` : ''}`);
  if (racks.length > 1) throw new Error(`There are ${racks.length} racks named "${rackName}"; fill in the Room column`);
  return racks[0];
}

const newId = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

function importRack(site: Site, cells: Cells): Omit<RowResult, 'row'> {
  const id = cells.get('id');
  const name = cells.get('name');
  const roomName = cells.get('room');
  let rack = id ? site.racks.find((r) => r.id === id) : undefined;
  if (!rack && name) {
    const matches = site.racks.filter((r) => same(r.name, name) && (!roomName || same(findRoomName(site, r.roomId), roomName)));
    if (matches.length > 1) throw new Error(`There are ${matches.length} racks named "${name}"; fill in the Room column`);
    rack = matches[0];
  }

  // The room, created if it doesn't exist yet.
  let room = roomName ? findRoom(site, roomName) : undefined;
  let newRoom = false;
  if (roomName && !room) {
    room = { id: newId('room'), ...RoomInput.parse({
      name: roomName, x: Math.max(0, ...site.rooms.map((r) => r.x + r.width + 80)), y: 0, width: 900, height: 1100,
    }) };
    site.rooms.push(room);
    newRoom = true;
  }

  const height = cells.get('height') ? toInt('Height', cells.get('height')!) : undefined;

  if (rack) {
    const before = { ...rack };
    if (name) rack.name = name;
    if (height !== undefined) rack.uHeight = height;
    if (room && room.id !== rack.roomId) {
      rack.roomId = room.id;
      Object.assign(rack, placeRack(site, room.id, rack.id));
    }
    RackInput.parse(rack);
    const changes = diff(before, rack, { uHeight: 'height', roomId: 'room', x: 'position', y: 'position' });
    return { action: changes ? 'update' : 'unchanged', item: `Rack ${rack.name}`, detail: changes || undefined };
  }

  if (!name) throw new Error('Name is required for a new rack');
  if (!room) {
    if (site.rooms.length !== 1) throw new Error('Room is required for a new rack');
    room = site.rooms[0];
  }
  const created = { id: newId('rack'), ...RackInput.parse({ name, roomId: room.id, uHeight: height ?? 42, ...placeRack(site, room.id) }) };
  site.racks.push(created);
  return { action: 'add', item: `Rack ${name}`, detail: `in ${room.name}${newRoom ? ' (new room)' : ''}` };
}

const findRoomName = (site: Site, roomId: string) => site.rooms.find((r) => r.id === roomId)?.name ?? '';

/**
 * Next free spot along the top of a room (racks are 360px wide). If the room is too
 * narrow it's widened, and rooms to its right move along so they don't overlap.
 */
function placeRack(site: Site, roomId: string, exceptId?: string) {
  const others = site.racks.filter((r) => r.roomId === roomId && r.id !== exceptId);
  const x = Math.max(30, ...others.map((r) => r.x + 400));
  const room = site.rooms.find((r) => r.id === roomId)!;
  const grow = x + 400 - room.width;
  if (grow > 0) {
    for (const r of site.rooms) {
      if (r !== room && r.x >= room.x + room.width) r.x += grow;
    }
    room.width += grow;
  }
  return { x, y: 60 };
}

const kindWords: Record<string, z.infer<typeof DeviceKind>> = {
  server: 'server', switch: 'switch', patchpanel: 'patch-panel', panel: 'patch-panel', pdu: 'pdu', other: 'other',
  router: 'other', firewall: 'other', storage: 'other', ups: 'other',
};
const mountingWords: Record<string, z.infer<typeof Mounting>> = {
  both: 'both', full: 'both', fulldepth: 'both', frontandrear: 'both', front: 'front', frontonly: 'front', rear: 'rear', rearonly: 'rear', back: 'rear',
};

function importDevice(site: Site, cells: Cells): Omit<RowResult, 'row'> {
  const id = cells.get('id');
  const name = cells.get('name');
  const rack = cells.get('rack') ? findRack(site, cells.get('rack')!, cells.get('room') || undefined) : undefined;

  let device = id ? site.devices.find((d) => d.id === id) : undefined;
  if (!device && name && rack) device = site.devices.find((d) => d.rackId === rack.id && same(d.name, name));

  // Start from the existing device, or a new one (from a preset, if named).
  const presetName = cells.get('preset');
  const preset = presetName ? site.presets.find((p) => same(p.name, presetName) || same(p.model ?? '', presetName)) : undefined;
  if (presetName && !preset) throw new Error(`No preset named "${presetName}"`);

  const isNew = !device;
  if (isNew) {
    if (!name) throw new Error('Name is required for a new device');
    if (!rack) throw new Error('Rack is required for a new device');
  }
  const before = device ? { ...device } : undefined;
  const d: Record<string, unknown> = device ? { ...device } : { kind: 'server', uHeight: 1, mounting: 'both', frontPorts: [], rearPorts: [] };

  if (preset) {
    const { kind, uHeight, mounting, frontPorts, rearPorts, manufacturer, model, psus, powerDraw, outlets, capacity } = preset;
    Object.assign(d, { kind, uHeight, mounting: mounting ?? 'both', frontPorts, rearPorts });
    for (const [k, v] of Object.entries({psus, powerDraw, outlets, capacity})) if (v) d[k] = v;
    if (manufacturer) d.manufacturer = manufacturer;
    if (model) d.model = model;
  }

  if (name) d.name = name;
  if (cells.get('type')) {
    const kind = kindWords[norm(cells.get('type')!)];
    if (!kind) throw new Error(`Unknown type "${cells.get('type')}" (use server, switch, patch-panel or other)`);
    d.kind = kind;
  }
  if (cells.get('mounting')) {
    const m = mountingWords[norm(cells.get('mounting')!)];
    if (!m) throw new Error(`Unknown mounting "${cells.get('mounting')}" (use both, front or rear)`);
    if (m !== 'both' || d.mounting !== undefined) d.mounting = m; // older data leaves the default unset
  }
  if (cells.get('height')) d.uHeight = toInt('Height', cells.get('height')!);
  // Blank port cells mean "no ports", unless a preset is filling them in.
  for (const k of ['frontPorts', 'rearPorts']) {
    if (cells.has(k) && (cells.get(k) || !preset)) {
      try {
        d[k] = parsePorts(cells.get(k)!);
      } catch (e) {
        throw new Error(`${k === 'frontPorts' ? 'Front' : 'Rear'} ports: ${message(e)}`);
      }
    }
  }
  setOptional(d, cells, ['manufacturer', 'model', 'serial', 'assetTag', 'ip', 'notes', 'feed']);
  for (const [k, label] of [['psus', 'PSUs'], ['powerDraw', 'Power'], ['outlets', 'Outlets'], ['capacity', 'Capacity']] as const) {
    if (!cells.has(k)) continue;
    if (cells.get(k)) d[k] = toInt(label, cells.get(k)!);
    else if (!preset) delete d[k];
  }

  const movedRack = rack && rack.id !== d.rackId;
  if (rack) d.rackId = rack.id;
  if (cells.get('u')) d.uPosition = toInt('Bottom U', cells.get('u')!);
  else if (isNew || movedRack) {
    const others = { ...site, devices: site.devices.filter((x) => x.id !== device?.id) };
    d.uPosition = firstFreeU(others, String(d.rackId), Number(d.uHeight), d.mounting as Device['mounting']);
  }

  const parsed = DeviceInput.parse(d);
  const where = `${findRoomName(site, site.racks.find((r) => r.id === parsed.rackId)!.roomId)} › ${site.racks.find((r) => r.id === parsed.rackId)!.name}`;
  if (device) {
    const updated = { id: device.id, ...parsed };
    site.devices[site.devices.indexOf(device)] = updated;
    const changes = diff(before!, updated, {
      uPosition: 'Bottom U', uHeight: 'height', rackId: 'rack', kind: 'type', frontPorts: 'front ports', rearPorts: 'rear ports', assetTag: 'asset tag',
      psus: 'PSUs', powerDraw: 'Power', outlets: 'Outlets', capacity: 'Capacity',
    });
    return { action: changes ? 'update' : 'unchanged', item: parsed.name, detail: changes || undefined };
  }
  site.devices.push({ id: newId('dev'), ...parsed });
  return { action: 'add', item: parsed.name, detail: `${where} · U${parsed.uPosition}${preset ? ` · from preset ${preset.name}` : ''}` };
}

/**
 * Finds a port from text such as "Server Room A › A1 › web-01 › eth0", "web-01 > eth0",
 * "Core Switch > 3" (port number), "A1 › Patch Panel 1 › r3" (rear port 3), "wall port A-01"
 * or "A-01". Leading parts can be left off as long as the rest is unique.
 * A port id ("a1-srv1:1") works too.
 */
function portResolver(site: Site) {
  const ports = [...indexPorts(site).values()];
  const segs = ports.map((p) => p.label.toLowerCase().split(' › '));
  return (text: string, which: string): string => {
    const q = text.trim();
    if (!q) throw new Error(`${which} is required`);
    const byId = ports.find((p) => p.id === q);
    if (byId) return byId.id;
    const parts = q.toLowerCase().split(/\s*[›>|]\s*/).filter(Boolean);
    const last = parts[parts.length - 1];
    const matches = ports.filter((p, i) => {
      const s = segs[i];
      if (parts.length > s.length) return false;
      const tail = s.slice(s.length - parts.length);
      // The port by name, or by number: "3" = front port 3, "r3" = rear port 3.
      const byNumber = p.kind === 'device' && (last === `${p.port}` ? p.face === 'front' : last === `r${p.port}` && p.face === 'rear');
      const lastOk = byNumber || [last, `port ${last}`, `wall port ${last}`].includes(tail[tail.length - 1]);
      return lastOk && parts.slice(0, -1).every((part, j) => tail[j] === part);
    });
    if (matches.length === 1) return matches[0].id;
    if (matches.length === 0) throw new Error(`${which}: no port matches "${q}"`);
    const some = matches.slice(0, 3).map((m) => m.label).join('; ');
    throw new Error(`${which}: "${q}" matches ${matches.length} ports (${some}${matches.length > 3 ? '; …' : ''}); add the rack or room`);
  };
}

const cableTypes = CableInput.shape.type.unwrap().options;

function importCable(site: Site, cells: Cells, resolve: ReturnType<typeof portResolver>): Omit<RowResult, 'row'> {
  const id = cells.get('id');
  let cable = id ? site.cables.find((c) => c.id === id) : undefined;
  const a = cells.get('a') ? resolve(cells.get('a')!, 'From') : cable?.a;
  const b = cells.get('b') ? resolve(cells.get('b')!, 'To') : cable?.b;
  if (!a) throw new Error('From is required');
  if (!b) throw new Error('To is required');
  if (!cable) cable = site.cables.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));

  const before = cable ? { ...cable } : undefined;
  const c: Record<string, unknown> = cable ? { ...cable } : { colour: '#64748b' };
  const flipped = cable && cable.a === b && cable.b === a; // same cable, written the other way round
  if (!flipped) {
    c.a = a;
    c.b = b;
  }
  setOptional(c, cells, ['label']);
  if (cells.has('type')) {
    const t = cells.get('type')!.toLowerCase().split(/[\s-]/)[0];
    if (t && !cableTypes.includes(t as never)) throw new Error(`Unknown cable type "${cells.get('type')}" (use ${cableTypes.join(', ')})`);
    if (t) c.type = t;
    else delete c.type;
  }
  if (cells.get('colour')) c.colour = cells.get('colour')!.replace(/^(?!#)/, '#').toLowerCase();
  const routing = cells.get('routing')?.toLowerCase();
  if (routing && (routing !== 'bundled' || c.routing !== undefined)) c.routing = routing; // older data leaves the default unset

  const parsed = CableInput.parse(c);
  const ports = indexPorts(site);
  const end = (p: string) => ports.get(p)!.label.split(' › ').slice(-2).join(' ');
  const item = parsed.label || `${end(parsed.a)} ↔ ${end(parsed.b)}`;
  if (cable) {
    const updated: Cable = { id: cable.id, ...parsed };
    site.cables[site.cables.indexOf(cable)] = updated;
    const changes = diff(before!, updated, { a: 'from', b: 'to' });
    return { action: changes ? 'update' : 'unchanged', item, detail: changes || undefined };
  }
  site.cables.push({ id: newId('cable'), ...parsed });
  return { action: 'add', item, detail: parsed.label ? `${end(parsed.a)} ↔ ${end(parsed.b)}` : undefined };
}

/**
 * Applies a CSV to a copy of the site, row by row. A row that fails (bad value, clash,
 * port already in use…) is reported and skipped; the others still apply.
 */
export function importCsv(site: Site, table: Table, text: string): ImportResult & { site: Site } {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new HttpError(400, 'The file is empty');

  // Match the header row to known columns, by name or alias.
  const keyAt: (string | undefined)[] = header.map((h) => {
    const n = norm(h);
    return columns[table].find((c) => norm(c.header) === n || norm(c.key) === n || c.aliases?.includes(n))?.key;
  });
  const ignoredColumns = header.filter((h, i) => !keyAt[i] && h.trim());
  const required = { racks: ['name'], devices: ['name'], cables: ['a', 'b'] }[table];
  const missing = required.filter((k) => !keyAt.includes(k) && !keyAt.includes('id'));
  if (missing.length) {
    const names = missing.map((k) => columns[table].find((c) => c.key === k)!.header);
    throw new HttpError(400, `This doesn't look like a ${table} file: it needs a ${names.join(' and ')} column`);
  }

  let draft = structuredClone(site);
  const results: RowResult[] = [];
  rows.forEach((cellsRow, i) => {
    const cells: Cells = {
      has: (key) => keyAt.includes(key),
      get: (key) => {
        const at = keyAt.indexOf(key);
        return at < 0 ? undefined : (cellsRow[at] ?? '').trim();
      },
    };
    const next = structuredClone(draft);
    try {
      const r =
        table === 'racks' ? importRack(next, cells)
        : table === 'devices' ? importDevice(next, cells)
        : importCable(next, cells, portResolver(next));
      if (r.action !== 'unchanged') {
        validate(next); // the row must leave the whole site valid, e.g. no overlapping devices
        draft = next;
      }
      results.push({ row: i + 2, ...r });
    } catch (e) {
      const item = cells.get('name') || cells.get('label') || [cells.get('a'), cells.get('b')].filter(Boolean).join(' ↔ ') || cells.get('id') || '';
      results.push({ row: i + 2, action: 'error', item, detail: message(e) });
    }
  });

  const counts = { add: 0, update: 0, unchanged: 0, error: 0 };
  for (const r of results) counts[r.action]++;
  return { site: draft, rows: results, counts, ignoredColumns };
}