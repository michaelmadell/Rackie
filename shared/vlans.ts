// VLANs: what each cable carries, worked out from the port settings at the two
// ends of its circuit (through any patch panels).
import type { Device, PortConfig, Site, Vlan } from './schema';
import type { PortRef } from './ports';
import { makeTracer } from './trace';

/** "3" for front port 3, "r3" for rear port 3: the key used in a device's portConfig. */
export const portKey = (portId: string) => portId.slice(portId.indexOf(':') + 1);

export type CircuitVlans = {
  untagged?: number; // access VLAN (or a trunk's native VLAN)
  tagged: number[]; // non-empty = a trunk
  mismatch?: string; // the two ends disagree
};

export const NO_VLAN = '#cbd5e1';
export const TRUNK = 'var(--vlan-trunk)';
export const MISMATCH = '#dc2626';

/** "10, 20, 30–35" */
export function formatVids(vids: number[]): string {
  const sorted = [...new Set(vids)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    out.push(j - i >= 2 ? `${sorted[i]}–${sorted[j]}` : sorted.slice(i, j + 1).join(', '));
    i = j;
  }
  return out.join(', ');
}

/** "10, 20, 30-35" → [10, 20, 30, 31, 32, 33, 34, 35]. Throws on anything else. */
export function parseVids(text: string): number[] {
  const out: number[] = [];
  for (const part of text.split(/[,\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:[-–](\d+))?$/);
    if (!m) throw new Error(`"${part}" isn't a VLAN ID or range`);
    const [from, to] = [Number(m[1]), Number(m[2] ?? m[1])];
    if (from < 1 || to > 4094 || to < from) throw new Error(`"${part}" isn't a valid range (1–4094)`);
    if (to - from > 4093) throw new Error('Range too large');
    for (let v = from; v <= to; v++) out.push(v);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

function configOf(devices: Map<string, Device>, p: PortRef): PortConfig | undefined {
  if (p.kind !== 'device') return undefined;
  return devices.get(p.deviceId!)?.portConfig?.[portKey(p.id)];
}

/** Combines the settings at the two ends of a circuit (usually only the switch end is set). */
function combine(a?: PortConfig, b?: PortConfig): CircuitVlans {
  const tagged = [...new Set([...(a?.tagged ?? []), ...(b?.tagged ?? [])])].sort((x, y) => x - y);
  const result: CircuitVlans = { untagged: a?.vlan ?? b?.vlan, tagged };
  const configured = (c?: PortConfig) => c && (c.vlan !== undefined || (c.tagged?.length ?? 0) > 0);
  if (configured(a) && configured(b)) {
    if (a!.vlan !== b!.vlan) result.mismatch = `untagged VLAN ${a!.vlan ?? 'none'} at one end, ${b!.vlan ?? 'none'} at the other`;
    else if (formatVids(a!.tagged ?? []) !== formatVids(b!.tagged ?? [])) {
      result.mismatch = `tagged VLANs differ (${formatVids(a!.tagged ?? []) || 'none'} vs ${formatVids(b!.tagged ?? []) || 'none'})`;
    }
  }
  return result;
}

export function makeVlans(site: Site) {
  const devices = new Map(site.devices.map((d) => [d.id, d]));
  const byVid = new Map<number, Vlan>(site.vlans.map((v) => [v.vid, v]));
  const { trace } = makeTracer(site);

  // Every cable gets the VLANs of the circuit it's part of.
  const forCable = new Map<string, CircuitVlans>();
  for (const c of site.cables) {
    if (forCable.has(c.id)) continue;
    const path = trace(c.id);
    if (!path) continue;
    const v = combine(configOf(devices, path.start), configOf(devices, path.end));
    for (const h of path.hops) forCable.set(h.cable.id, v);
  }

  const label = (vid: number) => `${vid}${byVid.get(vid) ? ` ${byVid.get(vid)!.name}` : ''}`;

  return {
    byVid,
    forCable: (cableId: string) => forCable.get(cableId),
    /** Line colour when colouring cables by VLAN. */
    colour(cableId: string): string {
      const v = forCable.get(cableId);
      if (!v) return NO_VLAN;
      if (v.mismatch) return MISMATCH;
      if (v.tagged.length) return TRUNK;
      return v.untagged ? (byVid.get(v.untagged)?.colour ?? '#64748b') : NO_VLAN;
    },
    /** "VLAN 10 Servers", "Trunk: 10, 20 (native 1)" or "No VLAN set". */
    describe(cableId: string): string {
      const v = forCable.get(cableId);
      if (!v || (!v.untagged && !v.tagged.length)) return 'No VLAN set';
      if (v.tagged.length) return `Trunk: ${formatVids(v.tagged)}${v.untagged ? ` (native ${v.untagged})` : ''}`;
      return `VLAN ${label(v.untagged!)}`;
    },
    carries: (cableId: string, vid: number) => {
      const v = forCable.get(cableId);
      return !!v && (v.untagged === vid || v.tagged.includes(vid));
    },
    /** Ports set to a VLAN (untagged or tagged), for a VLAN's "used on" list. */
    portsWith(vid: number) {
      return site.devices.flatMap((d) =>
        Object.entries(d.portConfig ?? {})
          .filter(([, c]) => c.vlan === vid || c.tagged?.includes(vid))
          .map(([key, c]) => ({ device: d, key, tagged: c.vlan !== vid })),
      );
    },
  };
}