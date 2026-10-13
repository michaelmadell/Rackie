import type { Edge, Node } from '@xyflow/react';
import type { Cable, Device, Rack, Room, Site, WallPort } from '#shared/schema';
import { indexPorts, type PortRef } from '#shared/ports';
import { portsOn, topU, type Face } from '#shared/units';
import type { ColourBy, Selection, View } from '../app/AppContext';
import { portStubDy } from './layout';
import { layoutForView } from './viewLayout';
import { makeTracer } from '#shared/trace';
import { makeVlans, TRUNK } from '#shared/vlans';

export type RoomNodeType = Node<{ room: Room }, 'room'>;
export type RackNodeType = Node<
  { rack: Rack; devices: Device[]; faces: Face[]; hiddenCables: number },
  'rack'
>;
export type WallPortNodeType = Node<{ wallPort: WallPort }, 'wallPort'>;
export type AppNode = RoomNodeType | RackNodeType | WallPortNodeType;

export const facesFor = (view: View): Face[] => (view === 'both' ? ['front', 'rear'] : view === 'rear' ? ['rear'] : ['front']);

/** A cable is drawn only when both of its ends are on a face being shown (wall ports always are). */
function isVisible(c: Cable, ports: Map<string, PortRef>, faces: Face[]) {
  return [c.a, c.b].every((id) => {
    const p = ports.get(id);
    return p && (p.kind === 'wall' || faces.includes(p.face!));
  });
}

export function buildNodes(realSite: Site, view: View): AppNode[] {
  const site = layoutForView(realSite, view);
  const faces = facesFor(view);
  const movable = view !== 'both'; // the Both view lays racks out itself
  const ports = indexPorts(site);
  const hidden = site.cables.filter((c) => !isVisible(c, ports, faces));

  // Parent (room) nodes must come before their children.
  const rooms: AppNode[] = site.rooms.map((room) => ({
    id: room.id,
    type: 'room',
    draggable: movable,
    dragHandle: '.room-label', // move rooms by their name strip; dragging the floor pans the canvas
    position: { x: room.x, y: room.y },
    data: { room },
    style: { width: room.width, height: room.height },
  }));

  const racks: AppNode[] = site.racks.map((rack) => ({
    id: rack.id,
    type: 'rack',
    draggable: movable,
    parentId: rack.roomId,
    position: { x: rack.x, y: rack.y },
    data: {
      rack,
      devices: site.devices.filter((d) => d.rackId === rack.id),
      faces,
      // Cables plugged into this rack that can't be drawn because an end is on a face not shown.
      hiddenCables: hidden.filter((c) => [c.a, c.b].some((id) => ports.get(id)?.nodeId === rack.id)).length,
    },
  }));

  const wallPorts: AppNode[] = site.wallPorts.map((wallPort) => ({
    id: wallPort.id,
    type: 'wallPort',
    draggable: movable,
    parentId: wallPort.roomId,
    position: { x: wallPort.x, y: wallPort.y },
    data: { wallPort },
  }));

  return [...rooms, ...racks, ...wallPorts];
}

/** Per-end routing info worked out from the data (geometry is added at draw time). */
export type EndInfo =
  | { kind: 'device'; stubDy: number; lane: number }
  | { kind: 'wall' };

export type CableEdgeData = {
  routing: 'bundled' | 'direct';
  a: EndInfo;
  b: EndInfo;
  roomA: string;
  roomB: string;
  trayLaneA: number; // lane on the tray above room A
  trayLaneB: number; // lane on the tray above room B
};
export type CableEdgeType = Edge<CableEdgeData, 'cable'>;

function groupBy<T>(items: T[], key: (t: T) => string): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return [...groups.values()];
}

/**
 * Cables to emphasise: the whole path (through patch panels) of the selected cable,
 * or every path leaving the selected device. Null when nothing is selected.
 */
export function highlightedCables(site: Site, selected: Selection): Set<string> | null {
    if (selected?.kind === 'vlan') {
        const vid = site.vlans.find((v) => v.id === selected.id)?.vid;
        const vlans = makeVlans(site);
        return new Set(site.cables.filter((c) => vid !== undefined && vlans.carries(c.id, vid)).map((c) => c.id));
    }
  if (selected?.kind !== 'cable' && selected?.kind !== 'device') return null;
  const { trace, cableAt, ports } = makeTracer(site);
  const startCables =
    selected.kind === 'cable'
      ? [selected.id]
      : [...ports.values()].filter((p) => p.deviceId === selected.id).flatMap((p) => cableAt.get(p.id)?.id ?? []);
  const cables = new Set(startCables.flatMap((id) => trace(id)?.hops.map((h) => h.cable.id) ?? []));
  return cables.size > 0 ? cables : null; // a device with no cables: don't fade everything
}

export function buildEdges(realSite: Site, view: View, selected: Selection, colourBy: ColourBy = 'cable'): CableEdgeType[] {
  const site = layoutForView(realSite, view);
  const vlans = colourBy === 'vlan' ? makeVlans(site): null;
  const ports = indexPorts(site);
  const devices = new Map(site.devices.map((d) => [d.id, d]));
  const faces = facesFor(view);
  const cables = site.cables.filter((c) => isVisible(c, ports, faces));
  const bundled = cables.filter((c) => c.routing !== 'direct');
  const selectedCableId = selected?.kind === 'cable' ? selected.id : undefined;
  const highlight = highlightedCables(site, selected);

  const stubDy = (p: PortRef) => {
    const d = devices.get(p.deviceId!)!;
    return portStubDy(d.uHeight, portsOn(d, p.face!), p.port!);
  };

  // Riser lanes, per rack. Cables leaving lower in the rack take outer lanes, so they
  // pass outside the ones above them instead of crossing them.
  const riserLane = new Map<string, number>(); // port id -> lane (a port has at most one cable)
  const heightInRack = (p: PortRef) => {
    const d = devices.get(p.deviceId!)!;
    return stubDy(p) < 0 ? topU(d) : d.uPosition - 1; // the device edge the cable leaves by
  };
  const deviceEnds = bundled.flatMap((c) => [ports.get(c.a)!, ports.get(c.b)!]).filter((p) => p.kind === 'device');
    for (const rackEnds of groupBy(deviceEnds, (p) => `${p.nodeId}|${p.face}`)) {
    rackEnds
      .sort((x, y) => heightInRack(y) - heightInRack(x) || x.port! - y.port!)
      .forEach((p, lane) => riserLane.set(p.id, lane));
  }

  // Tray lanes, per room. Shorter runs sit closest to the room, longer ones outside them.
  const rooms = new Map(site.rooms.map((r) => [r.id, r]));
  const racks = new Map(site.racks.map((r) => [r.id, r]));
  const wallPorts = new Map(site.wallPorts.map((w) => [w.id, w]));
  const roughX = (p: PortRef) => {
    const room = rooms.get(p.roomId)!;
    const rack = racks.get(p.nodeId);
    return room.x + (rack ? rack.x + 130 : (wallPorts.get(p.id)?.x ?? 0) + 30);
  };
  const span = (c: (typeof cables)[number]) => Math.abs(roughX(ports.get(c.a)!) - roughX(ports.get(c.b)!));
  const viaTray = bundled.filter((c) => ports.get(c.a)!.nodeId !== ports.get(c.b)!.nodeId);
  const trayLane = new Map<string, number>(); // `${roomId}|${cableId}` -> lane
  for (const room of site.rooms) {
    viaTray
      .filter((c) => ports.get(c.a)!.roomId === room.id || ports.get(c.b)!.roomId === room.id)
      .sort((x, y) => span(x) - span(y))
      .forEach((c, lane) => trayLane.set(`${room.id}|${c.id}`, lane));
  }

  const endInfo = (p: PortRef): EndInfo =>
    p.kind === 'wall' ? { kind: 'wall' } : { kind: 'device', stubDy: stubDy(p), lane: riserLane.get(p.id) ?? 0 };

  return cables.map((c) => {
    const a = ports.get(c.a)!;
    const b = ports.get(c.b)!;
    const isSelected = c.id === selectedCableId;
    const stroke = vlans ? vlans.colour(c.id) : c.colour;
    const trunk = stroke === TRUNK;
    return {
      id: c.id,
      type: 'cable',
      source: a.nodeId,
      sourceHandle: c.a,
      target: b.nodeId,
      targetHandle: c.b,
      label: c.label,
      zIndex: isSelected || highlight?.has(c.id) ? 1001 : 1000, // draw cables above rooms and racks
      interactionWidth: 6, // bundled cables are close together; keep click targets narrow
      data: {
        routing: c.routing ?? 'bundled',
        a: endInfo(a),
        b: endInfo(b),
        roomA: a.roomId,
        roomB: b.roomId,
        trayLaneA: trayLane.get(`${a.roomId}|${c.id}`) ?? 0,
        trayLaneB: trayLane.get(`${b.roomId}|${c.id}`) ?? 0,
      },
      style: {
        stroke: stroke,
        strokeWidth: (isSelected ? 3.5 : highlight?.has(c.id) ? 2.75 : 1.75) + (trunk ? 0.75 : 0),
        opacity: highlight && !highlight.has(c.id) ? 0.2 : 1, // fade everything not on the path
        strokeDasharray: a.roomId !== b.roomId ? '6 3' : undefined, // cross-room
      },
    };
  });
}