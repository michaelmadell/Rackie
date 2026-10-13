import type { Device, Mounting, Site } from '#shared/schema';
import { indexPorts } from '#shared/ports';
import { clashes, portsOn, topU } from '#shared/units';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Lowest U where a device of the given height fits in a rack. */
export function firstFreeU(site: Site, rackId: string, uHeight: number, mounting?: Mounting): number {
  const rack = site.racks.find((r) => r.id === rackId);
  if (!rack) throw new HttpError(400, `Rack ${rackId} does not exist`);
  const inRack = site.devices.filter((d) => d.rackId === rackId);
  for (let u = 1; u + uHeight - 1 <= rack.uHeight; u++) {
    if (!inRack.some((d) => clashes(d, { uPosition: u, uHeight, mounting }))) return u;
  }
  throw new HttpError(409, `No free ${uHeight}U space in rack ${rack.name}`);
}

/** After a delete: remove anything that pointed at the deleted item. */
export function cascade(site: Site) {
  const roomIds = new Set(site.rooms.map((r) => r.id));
  site.racks = site.racks.filter((r) => roomIds.has(r.roomId));
  site.wallPorts = site.wallPorts.filter((w) => roomIds.has(w.roomId));

  const rackIds = new Set(site.racks.map((r) => r.id));
  site.devices = site.devices.filter((d) => rackIds.has(d.rackId));

  const ports = indexPorts(site);
  site.cables = site.cables.filter((c) => ports.has(c.a) && ports.has(c.b));

  const deviceIds = new Set(site.devices.map((d) => d.id));
  site.powerLinks = site.powerLinks.filter((l) => deviceIds.has(l.device) && deviceIds.has(l.pdu));

  // Attachments go with what they're attached to (the files are kept until cleanup, so Undo works).
  const owners = {
    room: new Set(site.rooms.map((x) => x.id)),
    rack: rackIds,
    device: deviceIds,
    wallPort: new Set(site.wallPorts.map((x) => x.id)),
    cable: new Set(site.cables.map((x) => x.id)),
  };
  site.attachments = site.attachments.filter((a) => owners[a.ownerKind].has(a.ownerId));
}

const MAX_PORTS_PER_U = 64; // per face; more than this can't be drawn legibly

/** Ports must match how the device is mounted, and fit on its face. */
function checkPorts(what: string, d: Pick<Device, 'mounting' | 'uHeight' | 'frontPorts' | 'rearPorts'>) {
  if (d.mounting === 'front' && portsOn(d, 'rear') > 0) {
    throw new HttpError(400, `${what} is mounted on the front only, so it can't have rear ports`);
  }
  if (d.mounting === 'rear' && portsOn(d, 'front') > 0) {
    throw new HttpError(400, `${what} is mounted on the rear only, so it can't have front ports`);
  }
  for (const face of ['front', 'rear'] as const) {
    if (portsOn(d, face) > MAX_PORTS_PER_U * d.uHeight) {
      throw new HttpError(400, `${what} has more ${face} ports than fit on a ${d.uHeight}U face (max ${MAX_PORTS_PER_U * d.uHeight})`);
    }
  }
}

/** Throws if the site is not internally consistent. Run on every change. */
export function validate(site: Site) {
  const roomIds = new Set(site.rooms.map((r) => r.id));
  const racks = new Map(site.racks.map((r) => [r.id, r]));

  for (const r of site.racks) {
    if (!roomIds.has(r.roomId)) throw new HttpError(400, `Rack ${r.name}: room ${r.roomId} does not exist`);
  }
  for (const w of site.wallPorts) {
    if (!roomIds.has(w.roomId)) throw new HttpError(400, `Wall port ${w.label}: room ${w.roomId} does not exist`);
  }

  for (const d of site.devices) {
    const rack = racks.get(d.rackId);
    if (!rack) throw new HttpError(400, `Device ${d.name}: rack ${d.rackId} does not exist`);
    if (topU(d) > rack.uHeight) {
      throw new HttpError(400, `${d.name} (U${d.uPosition}–U${topU(d)}) does not fit in rack ${rack.name} (${rack.uHeight}U)`);
    }
    const clash = site.devices.find((o) => o.id !== d.id && o.rackId === d.rackId && clashes(o, d));
    if (clash) throw new HttpError(409, `${d.name} overlaps ${clash.name} in rack ${rack.name}`);
    checkPorts(d.name, d);
  }

  for (const p of site.presets) checkPorts(`Preset ${p.name}`, p);

  const ports = indexPorts(site);
  const used = new Set<string>();
  for (const c of site.cables) {
    if (c.a === c.b) throw new HttpError(400, 'A cable cannot connect a port to itself');
    for (const p of [c.a, c.b]) {
      const port = ports.get(p);
      if (!port) throw new HttpError(400, `Cable ${c.label || c.id} uses port ${p}, which does not exist`);
      if (used.has(p)) throw new HttpError(409, `${port.label} already has a cable`);
      used.add(p);
    }
  }

  checkPower(site);

  const vids = new Set<number>();
  for (const v of site.vlans) {
    if (vids.has(v.vid)) throw new HttpError(409, `VLAN ${v.vid} already exists`);
    vids.add(v.vid);
  }
}

/** Power cables: a PSU that exists, to a free outlet on a PDU in the same room. */
function checkPower(site: Site) {
  const devices = new Map(site.devices.map((d) => [d.id, d]));
  const racks = new Map(site.racks.map((r) => [r.id, r]));
  const roomOf = (d: Device) => racks.get(d.rackId)?.roomId;
  const usedOutlets = new Set<string>();
  const usedPsus = new Set<string>();

  for (const l of site.powerLinks) {
    const d = devices.get(l.device);
    const pdu = devices.get(l.pdu);
    if (!d) throw new HttpError(400, `Power cable from device ${l.device}, which does not exist`);
    if (!pdu || pdu.kind !== 'pdu') throw new HttpError(400, `${d.name}: power cable to something that isn't a PDU`);
    if (d.id === pdu.id) throw new HttpError(400, `${d.name} can't power itself`);
    if (l.psu > (d.psus ?? 0)) {
      throw new HttpError(400, `${d.name} has ${d.psus ?? 0} PSU${d.psus === 1 ? '' : 's'}, so PSU ${l.psu} can't be plugged in (unplug it first)`);
    }
    if (l.outlet > (pdu.outlets ?? 0)) {
      throw new HttpError(400, `${pdu.name} has ${pdu.outlets ?? 0} outlets, so outlet ${l.outlet} doesn't exist (unplug it first)`);
    }
    if (roomOf(d) !== roomOf(pdu)) throw new HttpError(400, `${d.name} and ${pdu.name} are in different rooms`);
    const outlet = `${l.pdu}:${l.outlet}`;
    if (usedOutlets.has(outlet)) throw new HttpError(409, `${pdu.name} outlet ${l.outlet} is already in use`);
    const psu = `${l.device}:${l.psu}`;
    if (usedPsus.has(psu)) throw new HttpError(409, `${d.name} PSU ${l.psu} is already plugged in`);
    usedOutlets.add(outlet);
    usedPsus.add(psu);
  }
}