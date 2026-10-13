// Shared between the server (validation) and the web app (types only).
import { z } from 'zod';
import { BUILT_IN_PRESETS } from './presets';
import { PortGroups } from './portGroups';

const Id = z.string().min(1);
const Name = z.string().trim().min(1, 'is required').max(100);
const Coord = z.number().finite();
const Text = z.string().trim().max(200).optional(); // optional free text; blank = not set
const Notes = z.string().max(2000).optional();
// Loose check: IPv4 or IPv6, optionally with /prefix. Blank = not set.
const Ip = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F:.]+(\/\d{1,3})?$/, 'must be an IP address like 10.0.0.5 or 10.0.0.5/24')
  .optional();

// "Input" schemas describe what the API accepts when creating or updating.
export const RoomInput = z.object({
  name: Name,
  x: Coord,
  y: Coord,
  width: z.number().min(200).max(10000),
  height: z.number().min(200).max(10000),
});

export const RackInput = z.object({
  name: Name,
  roomId: Id,
  uHeight: z.number().int().min(1).max(60),
  x: Coord,
  y: Coord,
});

export const DeviceKind = z.enum(['server', 'switch', 'patch-panel', 'pdu', 'other']);

const Watts = z.number().int().min(0).max(100_000);
const Vid = z.number().int().min(1, 'VLAN IDs are 1–4094').max(4094, 'VLAN IDs are 1–4094');

// Per-port settings, keyed like the end of a port id: "3" = front port 3, "r3" = rear port 3.
export const PortConfig = z.object({
  description: z.string().trim().max(100).optional(),
  vlan: Vid.optional(), // untagged (access / native) VLAN
  tagged: z.array(Vid).max(4094).optional(), // tagged VLANs: present = a trunk port
});

// Which faces of the rack a device occupies. "both" (default when missing) = full depth;
// "front" / "rear" = half depth, so a front-only and a rear-only device can share a U.
export const Mounting = z.enum(['both', 'front', 'rear']);

export const DeviceInput = z.object({
  name: Name,
  rackId: Id,
  kind: DeviceKind,
  uPosition: z.number().int().min(1), // lowest U the device occupies
  uHeight: z.number().int().min(1).max(20),
  mounting: Mounting.optional(), // missing = "both"
  frontPorts: PortGroups, // see shared/portGroups.ts
  rearPorts: PortGroups,
  // Optional details
  manufacturer: Text,
  model: Text,
  serial: Text,
  assetTag: Text,
  ip: Ip,
  notes: Notes,
  // Power. Every device can have power supplies; PDUs have outlets, a feed and a capacity.
  psus: z.number().int().min(0).max(8).optional(), // power supply inlets
  powerDraw: Watts.optional(), // typical draw, watts
  outlets: z.number().int().min(0).max(64).optional(), // PDUs
  feed: z.string().trim().max(20).optional(), // PDUs: "A", "B"…
  capacity: Watts.optional(), // PDUs: watts it can supply
  // VLANs and descriptions per port
  portConfig: z.record(z.string(), PortConfig).optional(),
});

// A reusable device template: the hardware model, without where it is or which unit it is.
export const PresetInput = DeviceInput.pick({
  kind: true,
  uHeight: true,
  mounting: true,
  frontPorts: true,
  rearPorts: true,
  manufacturer: true,
  model: true,
  psus: true,
  powerDraw: true,
  outlets: true,
  capacity: true,
}).extend({ name: Name });

export const WallPortInput = z.object({
  label: Name,
  roomId: Id,
  x: Coord,
  y: Coord,
});

// A cable joins two port ids: "<deviceId>:<portNumber>" or a wall port's id.
export const CableInput = z.object({
  a: Id,
  b: Id,
  label: z.string().max(100).optional(),
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a hex colour like #2563eb'),
  // "bundled" (default when missing) follows racks and trays; "direct" is a straight curve.
  routing: z.enum(['bundled', 'direct']).optional(),
  type: z.enum(['cat5e', 'cat6', 'cat6a', 'om3', 'om4', 'os2', 'dac', 'aoc', 'other']).optional(),
});

// A power cable from one of a device's PSUs to an outlet on a PDU.
export const PowerLinkInput = z.object({
  device: Id,
  psu: z.number().int().min(1),
  pdu: Id,
  outlet: z.number().int().min(1),
});

export const VlanInput = z.object({
  vid: Vid,
  name: Name,
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a hex colour like #2563eb'),
});

export const AttachmentOwnerKind = z.enum(['room', 'rack', 'device', 'wallPort', 'cable']);

// A file attached to something. The file itself is stored in data/attachments/.
export const Attachment = z.object({
  id: Id,
  ownerKind: AttachmentOwnerKind,
  ownerId: Id,
  name: z.string().min(1).max(200), // shown and used when downloading
  type: z.string().max(100), // MIME type of the file as served
  file: z.string().regex(/^[\w.-]+$/), // stored file name
  encoding: z.enum(['br']).optional(), // stored brotli-compressed
  size: z.number().int().min(0), // bytes stored
  originalSize: z.number().int().min(0), // bytes as uploaded
  createdAt: z.string(),
});

// Stored entities = input + id.
export const Room = RoomInput.extend({ id: Id });
export const Rack = RackInput.extend({ id: Id });
export const Device = DeviceInput.extend({ id: Id });
export const WallPort = WallPortInput.extend({ id: Id });
export const Cable = CableInput.extend({ id: Id });
export const Preset = PresetInput.extend({ id: Id });
export const PowerLink = PowerLinkInput.extend({ id: Id });
export const Vlan = VlanInput.extend({ id: Id });

export const SiteSchema = z.object({
  rooms: z.array(Room).default([]),
  racks: z.array(Rack).default([]),
  devices: z.array(Device).default([]),
  wallPorts: z.array(WallPort).default([]),
  cables: z.array(Cable).default([]),
  // Files saved before presets existed get the built-in library.
  presets: z.array(Preset).default(() => structuredClone(BUILT_IN_PRESETS)),
  powerLinks: z.array(PowerLink).default([]),
  vlans: z.array(Vlan).default([]),
  attachments: z.array(Attachment).default([]),
});

export type Room = z.infer<typeof Room>;
export type Rack = z.infer<typeof Rack>;
export type Device = z.infer<typeof Device>;
export type DeviceKind = z.infer<typeof DeviceKind>;
export type Mounting = z.infer<typeof Mounting>;
export type WallPort = z.infer<typeof WallPort>;
export type Cable = z.infer<typeof Cable>;
export type Preset = z.infer<typeof Preset>;
export type PortConfig = z.infer<typeof PortConfig>;
export type PowerLink = z.infer<typeof PowerLink>;
export type Vlan = z.infer<typeof Vlan>;
export type Attachment = z.infer<typeof Attachment>;
export type AttachmentOwnerKind = z.infer<typeof AttachmentOwnerKind>;
export type Site = z.infer<typeof SiteSchema>;