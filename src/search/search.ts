// Searching the site: rooms, racks, devices (and their details), ports, wall ports
// and cables. Every word typed must appear somewhere in the item; results that
// match a name exactly or at the start rank above ones that match mid-word or
// only in a detail such as notes.
import type { Site } from '#shared/schema';
import { indexPorts, type PortRef } from '#shared/ports';
import { facesOf, type Face } from '#shared/units';
import { makeVlans, portKey } from '#shared/vlans';

export type SearchKind = 'room' | 'rack' | 'device' | 'port' | 'wallPort' | 'cable' | 'vlan';

export type SearchResult = {
  kind: SearchKind;
  id: string; // the item's id (for a port, the port id)
  title: string;
  subtitle: string;
  matched?: string; // the detail that matched, when it isn't the title, e.g. "serial CN0F7GH1"
  face?: Face; // the face it's on, so the view can switch to it
  cableId?: string; // ports: the cable plugged into it
  nodeIds: string[]; // canvas nodes to bring into view
  score: number;
};

type Field = { label?: string; value: string | undefined; primary?: boolean };

const kindOrder: Record<SearchKind, number> = { device: 0, port: 1, rack: 2, wallPort: 3, cable: 4, vlan: 5, room: 6 };
const MAX_RESULTS = 12;

/** Lower is better, or null if not every word is found. */
function scoreFields(words: string[], fields: Field[]): { score: number; matched?: Field } | null {
  const present = fields.filter((f): f is Field & { value: string } => !!f.value);
  const all = present.map((f) => f.value.toLowerCase()).join(' ');
  if (!words.every((w) => all.includes(w))) return null;

  // Rank by the best single field: exact > starts with > word starts with > contains.
  const phrase = words.join(' ');
  let best: { score: number; matched?: Field } = { score: 40 };
  for (const f of present) {
    const v = f.value.toLowerCase();
    const s =
      v === phrase ? 0
      : v.startsWith(phrase) ? 10
      : v.split(/[\s/._:-]+/).some((part) => part.startsWith(words[0])) ? 20
      : v.includes(phrase) ? 30
      : null;
    if (s !== null && s + (f.primary ? 0 : 5) < best.score) best = { score: s + (f.primary ? 0 : 5), matched: f };
  }
  return best;
}

export function searchSite(site: Site, query: string): SearchResult[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const rooms = new Map(site.rooms.map((r) => [r.id, r]));
  const racks = new Map(site.racks.map((r) => [r.id, r]));
  const where = (rackId: string) => {
    const rack = racks.get(rackId);
    return rack ? `${rooms.get(rack.roomId)?.name ?? '?'} › ${rack.name}` : '?';
  };
  const results: SearchResult[] = [];
  const add = (r: Omit<SearchResult, 'score' | 'matched'>, fields: Field[]) => {
    const hit = scoreFields(words, fields);
    if (!hit) return;
    const matched = hit.matched && !hit.matched.primary && hit.matched.label ? `${hit.matched.label} ${hit.matched.value}` : undefined;
    results.push({ ...r, matched, score: hit.score + kindOrder[r.kind] });
  };

  for (const room of site.rooms) {
    add({ kind: 'room', id: room.id, title: room.name, subtitle: 'Room', nodeIds: [room.id] }, [
      { value: room.name, primary: true },
    ]);
  }

  for (const rack of site.racks) {
    add(
      { kind: 'rack', id: rack.id, title: `Rack ${rack.name}`, subtitle: rooms.get(rack.roomId)?.name ?? '', nodeIds: [rack.id] },
      [{ value: rack.name, primary: true }, { value: `rack ${rack.name}`, primary: true }],
    );
  }

  for (const d of site.devices) {
    add(
      {
        kind: 'device',
        id: d.id,
        title: d.name,
        subtitle: `${where(d.rackId)} · U${d.uPosition}`,
        face: facesOf(d)[0],
        nodeIds: [d.rackId],
      },
      [
        { value: d.name, primary: true },
        { label: 'model', value: [d.manufacturer, d.model].filter(Boolean).join(' ') || undefined },
        { label: 'serial', value: d.serial },
        { label: 'asset', value: d.assetTag },
        { label: 'IP', value: d.ip },
        { label: 'notes', value: d.notes },
      ],
    );
  }

  // Ports: only when the search mentions the port itself, so "web-01" lists the
  // server rather than every one of its ports, but "web-01 eth1" finds the port.
  const ports = indexPorts(site);
  const cableAt = new Map<string, string>();
  for (const c of site.cables) {
    cableAt.set(c.a, c.id);
    cableAt.set(c.b, c.id);
  }
  const deviceName = new Map(site.devices.map((d) => [d.id, d.name]));
    const devices = new Map(site.devices.map((d) => [d.id, d]));
  for (const p of ports.values()) {
    if (p.kind !== 'device') continue;
    const description = devices.get(p.deviceId!)?.portConfig?.[portKey(p.id)]?.description;
    const own = `${p.name} ${description ?? ''}`.toLowerCase();
    if (!words.some((w) => own.includes(w))) continue;
    const dev = deviceName.get(p.deviceId!) ?? '';
    add(
      {
        kind: 'port',
        id: p.id,
        title: `${dev} · ${p.name}`,
        subtitle: `${where(p.nodeId)}${cableAt.has(p.id) ? '' : ' · not connected'}`,
        face: p.face,
        cableId: cableAt.get(p.id),
        nodeIds: [p.nodeId],
      },
      [{ value: p.name, primary: true }, { value: dev }, { label: 'description', value: description }],
    );
  }

  const vlanInfo = makeVlans(site);
  for (const v of site.vlans) {
    const used = vlanInfo.portsWith(v.vid);
    add(
      {
        kind: 'vlan',
        id: v.id,
        title: `VLAN ${v.vid} ${v.name}`,
        subtitle: `${used.length} port${used.length === 1 ? '' : 's'}`,
        nodeIds: [...new Set(used.map((u) => u.device.rackId))],
      },
      [{ value: String(v.vid), primary: true }, { value: v.name, primary: true }, { value: `vlan ${v.vid}`, primary: true }],
    );
  }

  for (const w of site.wallPorts) {
    add(
      { kind: 'wallPort', id: w.id, title: `Wall port ${w.label}`, subtitle: rooms.get(w.roomId)?.name ?? '', nodeIds: [w.id] },
      [{ value: w.label, primary: true }, { value: `wall port ${w.label}` }],
    );
  }

  const endName = (p: PortRef) => (p.kind === 'wall' ? p.name : `${deviceName.get(p.deviceId!) ?? ''} ${p.name}`);
  for (const c of site.cables) {
    const a = ports.get(c.a);
    const b = ports.get(c.b);
    if (!a || !b) continue;
    add(
      {
        kind: 'cable',
        id: c.id,
        title: c.label || `Cable ${c.id}`,
        subtitle: `${endName(a)} ↔ ${endName(b)}`,
        nodeIds: [a.nodeId, b.nodeId],
      },
      [
        { value: c.label, primary: true },
        { label: 'type', value: c.type },
        { label: 'id', value: c.id },
      ],
    );
  }

  return results.sort((x, y) => x.score - y.score || x.title.length - y.title.length).slice(0, MAX_RESULTS);
}