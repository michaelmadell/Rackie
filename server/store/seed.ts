import type { Site } from '#shared/schema';
import { BUILT_IN_PRESETS } from '#shared/presets';

// Written to the database file the first time the server starts.
export const seed: Site = {
  rooms: [
    { id: 'room-a', name: 'Server Room A', x: 0, y: 0, width: 620, height: 460 },
    { id: 'room-b', name: 'Comms Room B', x: 760, y: 0, width: 400, height: 460 },
  ],
  racks: [
    { id: 'rack-a1', name: 'A1', roomId: 'room-a', uHeight: 12, x: 30, y: 60 },
    { id: 'rack-a2', name: 'A2', roomId: 'room-a', uHeight: 12, x: 330, y: 60 },
    { id: 'rack-b1', name: 'B1', roomId: 'room-b', uHeight: 12, x: 60, y: 60 },
  ],
    devices: [
    { id: 'a1-pp1', name: 'Patch Panel 1', rackId: 'rack-a1', kind: 'patch-panel', uPosition: 12, uHeight: 1, frontPorts: [{ count: 8, type: 'rj45' }], rearPorts: [{ count: 8, type: 'rj45' }] },
    { id: 'a1-sw1', name: 'Core Switch', manufacturer: 'Cisco', model: 'Catalyst 9300', ip: '10.0.0.2', rackId: 'rack-a1', kind: 'switch', uPosition: 11, uHeight: 1, frontPorts: [{ count: 8, type: 'rj45', name: 'Gi1/0/{n}' }], rearPorts: [] },
    { id: 'a1-srv1', name: 'web-01', manufacturer: 'Dell', model: 'PowerEdge R650', serial: 'CN0F7GH1', ip: '10.0.10.11', rackId: 'rack-a1', kind: 'server', uPosition: 8, uHeight: 2, frontPorts: [{ count: 2, type: 'rj45', name: 'eth{n0}' }], rearPorts: [] },
    { id: 'a1-srv2', name: 'web-02', rackId: 'rack-a1', kind: 'server', uPosition: 5, uHeight: 2, frontPorts: [{ count: 2, type: 'rj45', name: 'eth{n0}' }], rearPorts: [] },
    { id: 'a2-sw1', name: 'Access Switch', rackId: 'rack-a2', kind: 'switch', uPosition: 12, uHeight: 1, frontPorts: [{ count: 8, type: 'rj45', name: 'Gi1/0/{n}' }], rearPorts: [] },
    { id: 'a2-srv1', name: 'db-01', rackId: 'rack-a2', kind: 'server', uPosition: 9, uHeight: 2, frontPorts: [{ count: 2, type: 'rj45', name: 'eth{n0}' }], rearPorts: [] },
    { id: 'b1-pp1', name: 'Patch Panel 1', rackId: 'rack-b1', kind: 'patch-panel', uPosition: 12, uHeight: 1, frontPorts: [{ count: 8, type: 'rj45' }], rearPorts: [{ count: 8, type: 'rj45' }] },
    { id: 'b1-sw1', name: 'Edge Switch', rackId: 'rack-b1', kind: 'switch', uPosition: 11, uHeight: 1, frontPorts: [{ count: 8, type: 'rj45', name: 'Gi1/0/{n}' }], rearPorts: [] },
  ],
  wallPorts: [
    { id: 'wp-a-01', label: 'A-01', roomId: 'room-a', x: 120, y: 410 },
    { id: 'wp-a-02', label: 'A-02', roomId: 'room-a', x: 420, y: 410 },
    { id: 'wp-b-01', label: 'B-01', roomId: 'room-b', x: 150, y: 410 },
  ],
  cables: [
    { id: 'c1', a: 'a1-srv1:1', b: 'a1-sw1:1', colour: '#2563eb' },
    { id: 'c2', a: 'a1-srv2:1', b: 'a1-sw1:2', colour: '#2563eb' },
    { id: 'c3', a: 'a1-sw1:8', b: 'a2-sw1:8', colour: '#f59e0b', label: 'Uplink' },
    { id: 'c4', a: 'a2-srv1:1', b: 'a2-sw1:1', colour: '#2563eb' },
    { id: 'c5', a: 'a2-sw1:5', b: 'wp-a-02', colour: '#16a34a' },
    // Permanent link between the rooms, on the patch panels' rear ports…
    { id: 'c6', a: 'a1-pp1:r1', b: 'b1-pp1:r1', colour: '#dc2626', label: 'A↔B trunk' },
    // …patched through at the front at each end: Core Switch 7 ⇄ Edge Switch 7.
    { id: 'c8', a: 'a1-sw1:7', b: 'a1-pp1:1', colour: '#dc2626' },
    { id: 'c9', a: 'b1-pp1:1', b: 'b1-sw1:7', colour: '#dc2626' },
    // web-02 → patch panel → wall port A-01 (rear of the panel to the wall).
    { id: 'c10', a: 'a1-srv2:2', b: 'a1-pp1:2', colour: '#0891b2' },
    { id: 'c11', a: 'a1-pp1:r2', b: 'wp-a-01', colour: '#0891b2' },
  ],
  presets: structuredClone(BUILT_IN_PRESETS),
  powerLinks: [],
  vlans: [],
  attachments: []
};