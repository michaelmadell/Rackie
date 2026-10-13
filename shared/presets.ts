import type { Preset } from './schema';

// Starting library of common hardware. Saved into the database the first time the
// server runs (or loads an older file without presets), after which they can be
// edited or deleted like anything else. Add your own manufacturer/model details.
export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'preset-server-1u', name: '1U server', kind: 'server', uHeight: 1, mounting: 'both', psus: 2, powerDraw: 350,
    frontPorts: [],
    rearPorts: [
      { count: 1, type: 'rj45', name: 'mgmt' },
      { count: 2, type: 'rj45', name: 'eno{n}' },
      { count: 2, type: 'sfp', name: 'ens1f{n0}' },
    ],
  },
  {
    id: 'preset-server-2u', name: '2U server', kind: 'server', uHeight: 2, mounting: 'both', psus: 2, powerDraw: 600,
    frontPorts: [],
    rearPorts: [
      { count: 1, type: 'rj45', name: 'mgmt' },
      { count: 4, type: 'rj45', name: 'eno{n}' },
      { count: 2, type: 'sfp', name: 'ens1f{n0}' },
    ],
  },
  {
    id: 'preset-switch-24', name: '24-port switch', kind: 'switch', uHeight: 1, mounting: 'both', psus: 2, powerDraw: 150,
    frontPorts: [
      { count: 24, type: 'rj45', name: 'Gi1/0/{n}' },
      { count: 4, type: 'sfp', name: 'Te1/1/{n}' },
      { count: 1, type: 'console', name: 'console' },
    ],
    rearPorts: [],
  },
  {
    id: 'preset-switch-48', name: '48-port switch', kind: 'switch', uHeight: 1, mounting: 'both', psus: 2, powerDraw: 200,
    frontPorts: [
      { count: 48, type: 'rj45', name: 'Gi1/0/{n}' },
      { count: 4, type: 'sfp', name: 'Te1/1/{n}' },
      { count: 1, type: 'console', name: 'console' },
    ],
    rearPorts: [],
  },
  {
    id: 'preset-pp-24', name: '24-port patch panel', kind: 'patch-panel', uHeight: 1, mounting: 'both',
    frontPorts: [{ count: 24, type: 'rj45' }],
    rearPorts: [{ count: 24, type: 'rj45' }],
  },
  {
    id: 'preset-pp-48', name: '48-port patch panel (2U)', kind: 'patch-panel', uHeight: 2, mounting: 'both',
    frontPorts: [{ count: 48, type: 'rj45' }],
    rearPorts: [{ count: 48, type: 'rj45' }],
  },
  {
    id: 'preset-fibre-24', name: '24-port fibre panel (LC)', kind: 'patch-panel', uHeight: 1, mounting: 'both',
    frontPorts: [{ count: 24, type: 'lc' }],
    rearPorts: [{ count: 24, type: 'lc' }],
  },
  {
    id: 'preset-firewall', name: 'Firewall', kind: 'other', uHeight: 1, mounting: 'both', psus: 2, powerDraw: 100,
    frontPorts: [
      { count: 8, type: 'rj45', name: 'port{n}' },
      { count: 2, type: 'sfp', name: 'x{n}' },
      { count: 1, type: 'rj45', name: 'mgmt' },
    ],
    rearPorts: [],
  },
  { id: 'preset-pdu-8', name: 'PDU, 8 outlets (16A)', kind: 'pdu', uHeight: 1, mounting: 'rear',
    frontPorts: [], rearPorts: [], outlets: 8, capacity: 3680,
  },
  {
    id: 'preset-pdu-16', name: 'PDU, 16 outlets (32A)', kind: 'pdu', uHeight: 1, mounting: 'rear',
    frontPorts: [], rearPorts: [], outlets: 16, capacity: 7360,
  },
  { id: 'preset-blank-1u', name: 'Blanking panel', kind: 'other', uHeight: 1, mounting: 'front', frontPorts: [], rearPorts: [] },
  { id: 'preset-cable-mgr', name: 'Cable manager', kind: 'other', uHeight: 1, mounting: 'front', frontPorts: [], rearPorts: [] },
];