// The logical network view: devices (and wall ports) joined by what they're really
// connected to, end to end, with patch panels and cable routes left out. Laid out
// automatically with dagre, busiest devices (usually switches) towards the top.
import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';
import type { Device, Site } from '#shared/schema';
import { buildSchedule, type Circuit, type ScheduleEnd } from '#shared/schedule';
import { makeVlans, TRUNK } from '#shared/vlans';
import type { ColourBy, Selection } from '../app/AppContext';

export type NetNodeData = {
  title: string;
  subtitle: string;
  ip?: string;
  kind: Device['kind'] | 'wall';
  roomColour: string;
  links: number;
  target: { kind: 'device' | 'wallPort'; id: string }; // what clicking selects
};
export type NetNodeType = Node<NetNodeData, 'netDevice'>;
export type NetEdgeData = { cableId: string; circuits: Circuit[] };
export type NetEdgeType = Edge<NetEdgeData>;

const NODE_W = 200;
const NODE_H = 62;
const ROOM_COLOURS = ['#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#db2777', '#ca8a04', '#475569'];

const nodeIdOf = (e: ScheduleEnd) => (e.port.kind === 'wall' ? e.port.id : e.port.deviceId!);

/**
 * Circuits grouped by the pair of things they join, with `a` the end drawn higher up:
 * the one with more links, or a switch on a tie.
 */
function linksOf(site: Site) {
  const pairs = new Map<string, { a: ScheduleEnd; b: ScheduleEnd; circuits: Circuit[] }>();
  const degree = new Map<string, number>();
  for (const c of buildSchedule(site)) {
    const [x, y] = [nodeIdOf(c.start), nodeIdOf(c.end)];
    if (x === y) continue; // looped back to the same device
    const key = [x, y].sort().join('|');
    const pair = pairs.get(key) ?? { a: c.start, b: c.end, circuits: [] };
    pair.circuits.push(c);
    pairs.set(key, pair);
    for (const id of [x, y]) degree.set(id, (degree.get(id) ?? 0) + 1);
  }
  const kinds = new Map(site.devices.map((d) => [d.id, d.kind]));
  const rank = (id: string) => (degree.get(id) ?? 0) * 10 + (kinds.get(id) === 'switch' ? 5 : 0);
  for (const p of pairs.values()) {
    if (rank(nodeIdOf(p.b)) > rank(nodeIdOf(p.a))) [p.a, p.b] = [p.b, p.a];
  }
  return { pairs, degree };
}

/** Node positions, recalculated only when the site changes (so selecting things doesn't move them). */
export function buildNetworkNodes(site: Site): NetNodeType[] {
  const { pairs, degree } = linksOf(site);
  const rooms = new Map(site.rooms.map((r, i) => [r.id, { name: r.name, colour: ROOM_COLOURS[i % ROOM_COLOURS.length] }]));
  const devices = new Map(site.devices.map((d) => [d.id, d]));

  const ends = new Map<string, ScheduleEnd>();
  for (const { a, b } of pairs.values()) {
    for (const e of [a, b]) ends.set(nodeIdOf(e), e);
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 90, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const id of ends.keys()) g.setNode(id, { width: NODE_W, height: NODE_H });
  for (const { a, b } of pairs.values()) g.setEdge(nodeIdOf(a), nodeIdOf(b)); // a above b
  dagre.layout(g);

  return [...ends.entries()].map(([id, e]) => {
    const pos = g.node(id);
    const d = devices.get(id);
    const room = rooms.get(e.port.roomId);
    return {
      id,
      type: 'netDevice',
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: {
        title: d ? d.name : `Wall port ${e.portName}`,
        subtitle: d ? `${room?.name ?? ''} › ${e.rack} · U${d.uPosition}` : (room?.name ?? ''),
        ip: d?.ip,
        kind: d ? d.kind : 'wall',
        roomColour: room?.colour ?? '#94a3b8',
        links: degree.get(id) ?? 0,
        target: d ? { kind: 'device', id } : { kind: 'wallPort', id },
      },
    };
  });
}

/** One line per connected pair; highlights follow the current selection. */
export function buildNetworkEdges(site: Site, selected: Selection, colourBy: ColourBy): NetEdgeType[] {
  const { pairs } = linksOf(site);
  const vlans = makeVlans(site);
  const vid = selected?.kind === 'vlan' ? site.vlans.find((v) => v.id === selected.id)?.vid : undefined;
  const showLabels = pairs.size <= 30; // labels on busy diagrams only when highlighted

  return [...pairs.entries()].map(([key, { a, b, circuits }]) => {
    const cableIds = circuits.flatMap((c) => c.cables.map((x) => x.cable.id));
    const first = circuits[0].cables[0].cable;
    const [x, y] = [nodeIdOf(a), nodeIdOf(b)];

    const highlighted =
      selected?.kind === 'device' || selected?.kind === 'wallPort' ? selected.id === x || selected.id === y
      : selected?.kind === 'cable' ? cableIds.includes(selected.id)
      : vid !== undefined ? cableIds.some((id) => vlans.carries(id, vid))
      : null; // nothing relevant selected
    const colours = new Set(circuits.map((c) => (colourBy === 'vlan' ? vlans.colour(c.cables[0].cable.id) : c.cables[0].cable.colour)));
    const stroke = colours.size === 1 ? [...colours][0] : colourBy === 'vlan' ? TRUNK : first.colour;
    const ports = (c: Circuit) => `${c.start.portName} – ${c.end.portName}`;
    const label = circuits.length === 1 ? ports(circuits[0]) : `${circuits.length} links`;

    return {
      id: `net:${key}`,
      source: x,
      target: y,
      label: showLabels || highlighted ? label : undefined,
      data: { cableId: first.id, circuits },
      zIndex: highlighted ? 10 : 1,
      labelStyle: { fontSize: 10, fill: 'var(--text-2)' },
      labelBgStyle: { fill: 'var(--surface)', fillOpacity: 0.85 },
      style: {
        stroke,
        strokeWidth: (highlighted ? 3 : 2) + (circuits.length > 1 ? 1.5 : 0),
        opacity: highlighted === false ? 0.15 : 1,
        strokeDasharray: a.port.roomId !== b.port.roomId ? '6 3' : undefined, // between rooms
      },
    };
  });
}