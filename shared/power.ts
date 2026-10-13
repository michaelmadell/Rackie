// Power: which PDU outlet each PSU is plugged into, how loaded each PDU is, and
// whether devices survive losing a feed. Draw figures are the devices' typical watts.
import type { Device, PowerLink, Site } from './schema';

export type PsuInfo = { psu: number; link?: PowerLink; pdu?: Device; feed?: string };

export type DevicePower = {
  psus: PsuInfo[];
  warnings: string[]; // e.g. "PSU 2 isn't plugged in", "No redundancy: both PSUs on feed A"
};

export type PduLoad = {
  normal: number; // watts with every feed up (each device's draw shared across its PSUs)
  worst: number; // watts if the other feeds fail and this PDU's feed carries everything
  capacity?: number;
  used: number; // outlets in use
};

export type RackPower = {
  draw: number; // watts drawn by devices in the rack
  feeds: { feed: string; capacity: number; normal: number; worst: number }[];
  warnings: string[];
};

/** A PDU's feed, or its own name if no feed is set (so two unlabelled PDUs still count as different feeds). */
export const feedOf = (pdu: Device) => pdu.feed || pdu.name;

export const formatWatts = (w: number) => (w >= 1000 ? `${(w / 1000).toFixed(w >= 10000 ? 0 : 1)} kW` : `${Math.round(w)} W`);

export function makePower(site: Site) {
  const devices = new Map(site.devices.map((d) => [d.id, d]));
  const linksOf = new Map<string, PowerLink[]>(); // device or PDU id -> links
  for (const l of site.powerLinks) {
    for (const id of [l.device, l.pdu]) linksOf.set(id, [...(linksOf.get(id) ?? []), l]);
  }
  const deviceLinks = (id: string) => (linksOf.get(id) ?? []).filter((l) => l.device === id);
  const pduLinks = (id: string) => (linksOf.get(id) ?? []).filter((l) => l.pdu === id);

  function forDevice(d: Device): DevicePower {
    const links = deviceLinks(d.id);
    const psus = Array.from({ length: d.psus ?? 0 }, (_, i) => {
      const link = links.find((l) => l.psu === i + 1);
      const pdu = link && devices.get(link.pdu);
      return { psu: i + 1, link, pdu, feed: pdu && feedOf(pdu) };
    });
    const warnings: string[] = [];
    const missing = psus.filter((p) => !p.link).map((p) => p.psu);
    if (missing.length === psus.length && psus.length > 0) warnings.push('Not plugged in to a PDU');
    else if (missing.length) warnings.push(`PSU ${missing.join(', ')} ${missing.length > 1 ? "aren't" : "isn't"} plugged in`);
    const feeds = new Set(psus.flatMap((p) => p.feed ?? []));
    if (psus.length > 1 && feeds.size === 1 && missing.length === 0) {
      warnings.push(`No redundancy: all PSUs are on feed ${[...feeds][0]}`);
    }
    return { psus, warnings };
  }

  /** Watts a device puts on one PDU, normally and if every other feed fails. */
  function share(d: Device, pdu: Device) {
    const links = deviceLinks(d.id);
    const draw = d.powerDraw ?? 0;
    const here = links.filter((l) => l.pdu === pdu.id).length;
    const sameFeed = links.filter((l) => {
      const p = devices.get(l.pdu);
      return p && feedOf(p) === feedOf(pdu);
    }).length;
    return { normal: links.length ? (draw * here) / links.length : 0, worst: sameFeed ? (draw * here) / sameFeed : 0 };
  }

  function forPdu(pdu: Device): PduLoad {
    const links = pduLinks(pdu.id);
    const users = [...new Set(links.map((l) => l.device))].flatMap((id) => devices.get(id) ?? []);
    const load = users.map((d) => share(d, pdu));
    return {
      normal: load.reduce((s, x) => s + x.normal, 0),
      worst: load.reduce((s, x) => s + x.worst, 0),
      capacity: pdu.capacity || undefined,
      used: links.length,
    };
  }

  function forRack(rackId: string): RackPower {
    const inRack = site.devices.filter((d) => d.rackId === rackId);
    const pdus = inRack.filter((d) => d.kind === 'pdu');
    const draw = inRack.filter((d) => d.kind !== 'pdu').reduce((s, d) => s + (d.powerDraw ?? 0), 0);
    const byFeed = new Map<string, { feed: string; capacity: number; normal: number; worst: number }>();
    const warnings: string[] = [];
    for (const pdu of pdus) {
      const load = forPdu(pdu);
      const f = byFeed.get(feedOf(pdu)) ?? { feed: feedOf(pdu), capacity: 0, normal: 0, worst: 0 };
      f.capacity += pdu.capacity ?? 0;
      f.normal += load.normal;
      f.worst += load.worst;
      byFeed.set(f.feed, f);
      if (load.capacity && load.normal > load.capacity) warnings.push(`${pdu.name} is overloaded (${formatWatts(load.normal)} of ${formatWatts(load.capacity)})`);
      else if (load.capacity && load.worst > load.capacity) warnings.push(`${pdu.name} would be overloaded if another feed failed (${formatWatts(load.worst)} of ${formatWatts(load.capacity)})`);
    }
    // Devices with a power problem: unplugged PSUs, or every PSU on the same feed.
    for (const d of inRack) {
      if (d.kind !== 'pdu' && d.psus) warnings.push(...forDevice(d).warnings.map((w) => `${d.name}: ${w}`));
    }
    return { draw, feeds: [...byFeed.values()].sort((a, b) => a.feed.localeCompare(b.feed)), warnings };
  }

  return { forDevice, forPdu, forRack, pduLinks, deviceLinks };
}