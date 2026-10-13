// The cable schedule: every cable, grouped into circuits. A circuit is one end-to-end
// connection, e.g. switch → patch panel → (trunk) → patch panel → switch is three
// cables but one circuit. Used by the printable schedule, its CSV and cable numbering.
import type { Cable, Site } from './schema';
import type { PortRef } from './ports';
import { makeTracer } from './trace';

export type ScheduleEnd = {
  port: PortRef;
  room: string;
  rack?: string; // device ports only
  u?: number; // bottom U of the device
  device?: string;
  portName: string; // "Gi1/0/7", "rear port 2", or the wall port's label
  isPanel: boolean; // a patch panel, i.e. the circuit carries on through it
};

export type ScheduleCable = { cable: Cable; id: string; a: ScheduleEnd; b: ScheduleEnd };

export type Circuit = {
  number: number; // 1, 2, 3… in schedule order
  start: ScheduleEnd;
  end: ScheduleEnd;
  cables: ScheduleCable[]; // in order from start to end
  panels: number; // patch panels passed through
};

/** "A1 U11", or the room for a wall port. Short enough for a cable label. */
export const shortWhere = (e: ScheduleEnd) => (e.rack ? `${e.rack} U${e.u}` : e.room);
/** "Core Switch Gi1/0/7", or "Wall port A-01". */
export const endName = (e: ScheduleEnd) => (e.device ? `${e.device} ${e.portName}` : `Wall port ${e.portName}`);

const byText = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const sortKey = (e: ScheduleEnd) => `${e.room}\u0000${e.rack ?? ''}\u0000${String(999 - (e.u ?? 0)).padStart(3, '0')}\u0000${endName(e)}`;

export function buildSchedule(site: Site): Circuit[] {
  const { ports, devices, trace } = makeTracer(site);
  const rooms = new Map(site.rooms.map((r) => [r.id, r.name]));
  const racks = new Map(site.racks.map((r) => [r.id, r.name]));

  const toEnd = (p: PortRef): ScheduleEnd => {
    if (p.kind === 'wall') {
      const w = site.wallPorts.find((x) => x.id === p.id);
      return { port: p, room: rooms.get(p.roomId) ?? '?', portName: w?.label ?? p.name, isPanel: false };
    }
    const d = devices.get(p.deviceId!)!;
    return {
      port: p,
      room: rooms.get(p.roomId) ?? '?',
      rack: racks.get(d.rackId),
      u: d.uPosition,
      device: d.name,
      portName: p.name,
      isPanel: d.kind === 'patch-panel',
    };
  };

  const circuits: Omit<Circuit, 'number'>[] = [];
  const done = new Set<string>();
  for (const c of site.cables) {
    if (done.has(c.id) || !ports.has(c.a) || !ports.has(c.b)) continue;
    const path = trace(c.id)!;
    for (const h of path.hops) done.add(h.cable.id);
    let cables = path.hops.map((h) => ({ cable: h.cable, id: h.cable.label || h.cable.id, a: toEnd(h.from), b: toEnd(h.to) }));

    // Read each circuit from its "first" end: an active device before a patch panel or
    // wall port, then by room, rack, U (top down) and name.
    const first = cables[0].a;
    const last = cables[cables.length - 1].b;
    const rank = (e: ScheduleEnd) => `${e.isPanel || !e.device ? 1 : 0}${sortKey(e)}`;
    if (byText(rank(last), rank(first)) < 0) {
      cables = cables.reverse().map((x) => ({ ...x, a: x.b, b: x.a }));
    }
    circuits.push({ start: cables[0].a, end: cables[cables.length - 1].b, cables, panels: cables.length - 1 });
  }

  return circuits
    .sort((x, y) => byText(sortKey(x.start), sortKey(y.start)))
    .map((c, i) => ({ ...c, number: i + 1 }));
}