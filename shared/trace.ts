// Follows cables through patch panels to find what is really connected to what.
//
// A patch panel's front port N is wired internally to its rear port N, so a cable
// plugged into one side carries on out of the other. Tracing a cable walks outward
// from both of its ends through any number of panels until the path stops at a
// port that isn't a pass-through, or a pass-through with nothing plugged into the
// other side.
import type { Cable, Device, Site } from './schema';
import { devicePortId, indexPorts, type PortRef } from './ports';
import { portsOn } from './units';

/** One cable in a path, oriented in the direction of travel. */
export type Hop = { cable: Cable; from: PortRef; to: PortRef };

/** Ordered from one end to the other: hops[i].to and hops[i+1].from are two sides of a patch panel. */
export type TracedPath = { start: PortRef; end: PortRef; hops: Hop[] };

/** The port on the other side of a patch panel, if this port passes through one. */
export function passThroughPeer(port: PortRef, devices: Map<string, Device>, ports: Map<string, PortRef>) {
  if (port.kind !== 'device') return undefined;
  const device = devices.get(port.deviceId!);
  if (device?.kind !== 'patch-panel') return undefined;
  const otherFace = port.face === 'rear' ? 'front' : 'rear';
  if (port.port! > portsOn(device, otherFace)) return undefined; // no matching port on the other side
  return ports.get(devicePortId(device.id, port.port!, otherFace));
}

export function makeTracer(site: Site) {
  const ports = indexPorts(site);
  const devices = new Map(site.devices.map((d) => [d.id, d]));
  const cableAt = new Map<string, Cable>();
  for (const c of site.cables) {
    cableAt.set(c.a, c);
    cableAt.set(c.b, c);
  }

  /** Keeps going from `port` (the far end of the last cable) through patch panels. */
  function walk(port: PortRef, seen: Set<string>): Hop[] {
    const hops: Hop[] = [];
    let at = port;
    for (;;) {
      const peer = passThroughPeer(at, devices, ports);
      const next = peer && cableAt.get(peer.id);
      if (!peer || !next || seen.has(next.id)) return hops; // end of the line (or a loop)
      seen.add(next.id);
      const to = ports.get(next.a === peer.id ? next.b : next.a)!;
      hops.push({ cable: next, from: peer, to });
      at = to;
    }
  }

  function trace(cableId: string): TracedPath | null {
    const cable = site.cables.find((c) => c.id === cableId);
    const a = cable && ports.get(cable.a);
    const b = cable && ports.get(cable.b);
    if (!cable || !a || !b) return null;

    const seen = new Set([cable.id]);
    const forward = walk(b, seen); // beyond b
    const backward = walk(a, seen); // beyond a, walking away from the cable
    // Turn the backward hops round so the whole path reads from one end to the other.
    const before = backward.reverse().map((h) => ({ cable: h.cable, from: h.to, to: h.from }));
    const hops = [...before, { cable, from: a, to: b }, ...forward];
    return { start: hops[0].from, end: hops[hops.length - 1].to, hops };
  }

  return { ports, devices, cableAt, trace };
}