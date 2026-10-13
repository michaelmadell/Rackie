import type { Device, Site, Vlan } from '#shared/schema';
import { api } from '../app/api';
import { collectionFor, siteKeyFor, useApp, type Kind } from '../app/AppContext';
import { EntityForm, type Field } from './EntityForm';
import { CablePath, DeviceConnections } from './PathView';
import { PowerPanel } from '../power/PowerPanel';
import { PortConfigEditor } from '../vlans/PortConfigEditor';
import { VlanPanel, VlanUsage } from '../vlans/VlanPanel';
import { Attachments } from '../attachments/Attachments';
import { PresetPalette } from './PresetPalette';
import { SearchBox } from '../search/SearchBox';
import { HistoryPanel, UndoButtons } from '../history/History';
import { ImportExportPanel } from '../csv/ImportExport';
import { CableSchedule } from '../print/CableSchedule';
import { useState } from 'react';
import { ThemeToggle } from '../app/ThemeToggle';

const kindLabel: Record<Kind, string> = {
  room: 'Room', rack: 'Rack', device: 'Device', wallPort: 'Wall port', cable: 'Cable', preset: 'Preset', vlan: 'VLAN',
};

// Power fields depend on the type: PDUs have outlets, everything else has power supplies.
const powerFields = (deviceKind: unknown): Field[] => [
  { type: 'heading', key: 'power-heading', label: 'Power' },
  ...(deviceKind === 'pdu'
    ? ([
        { key: 'outlets', label: 'Outlets', type: 'number' },
        { key: 'feed', label: 'Feed', type: 'text', placeholder: 'e.g. A or B' },
        { key: 'capacity', label: 'Capacity (W)', type: 'number', placeholder: 'e.g. 3680 for 16A at 230V' },
      ] as Field[])
    : ([
        { key: 'psus', label: 'Power supplies', type: 'number' },
        { key: 'powerDraw', label: 'Typical draw (W)', type: 'number' },
      ] as Field[])),
];

// Fields that describe the hardware itself, shared by devices and presets.
const hardwareFields = (deviceKind: unknown): Field[] => [
  {
    key: 'kind', label: 'Type', type: 'select',
    options: ['server', 'switch', 'patch-panel', 'pdu', 'other'].map((k) => ({ value: k, label: k === 'pdu' ? 'PDU' : k })),
  },
  { key: 'manufacturer', label: 'Manufacturer', type: 'text', placeholder: 'optional' },
  { key: 'model', label: 'Model', type: 'text', placeholder: 'optional' },
  { key: 'uHeight', label: 'Height (U)', type: 'number' },
  {
    key: 'mounting', label: 'Mounted', type: 'select',
    options: [
      { value: 'both', label: 'Front and rear (full depth)' },
      { value: 'front', label: 'Front only' },
      { value: 'rear', label: 'Rear only' },
    ],
  },
  { type: 'heading', key: 'ports-heading', label: 'Ports' },
  { key: 'frontPorts', label: 'Front', type: 'portGroups' },
  { key: 'rearPorts', label: 'Rear', type: 'portGroups' },
  ...powerFields(deviceKind),
];

// Details that belong to one physical unit rather than the model.
const unitFields: Field[] = [
  { type: 'heading', key: 'details-heading', label: 'Details' },
  { key: 'serial', label: 'Serial number', type: 'text', placeholder: 'optional' },
  { key: 'assetTag', label: 'Asset tag', type: 'text', placeholder: 'optional' },
  { key: 'ip', label: 'Management IP', type: 'text', placeholder: 'optional, e.g. 10.0.0.5' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const cableTypes = [
  { value: '', label: '—' },
  ...['cat5e', 'cat6', 'cat6a'].map((t) => ({ value: t, label: t.replace('cat', 'Cat') })),
  ...['om3', 'om4', 'os2'].map((t) => ({ value: t, label: `${t.toUpperCase()} fibre` })),
  { value: 'dac', label: 'DAC (direct attach)' },
  { value: 'aoc', label: 'AOC (active optical)' },
  { value: 'other', label: 'Other' },
];

function fieldsFor(kind: Kind, site: Site, entity: Record<string, unknown>): Field[] {
  const roomOptions = site.rooms.map((r) => ({ value: r.id, label: r.name }));
  const rackOptions = site.racks.map((r) => ({
    value: r.id,
    label: `${site.rooms.find((room) => room.id === r.roomId)?.name} › ${r.name}`,
  }));

  switch (kind) {
    case 'room':
      return [{ key: 'name', label: 'Name', type: 'text' }];
    case 'rack':
      return [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'roomId', label: 'Room', type: 'select', options: roomOptions },
        { key: 'uHeight', label: 'Height (U)', type: 'number' },
      ];
    case 'device':
      return [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'rackId', label: 'Rack', type: 'select', options: rackOptions },
        { key: 'uPosition', label: 'Bottom U', type: 'number' },
        ...hardwareFields(entity.kind),
        ...unitFields,
      ];
    case 'preset':
      return [{ key: 'name', label: 'Name', type: 'text' }, ...hardwareFields(entity.kind)];
    case 'vlan':
      return [
        { key: 'vid', label: 'VLAN ID', type: 'number' },
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'colour', label: 'Colour', type: 'color' },
      ];
    case 'wallPort':
      return [
        { key: 'label', label: 'Label', type: 'text' },
        { key: 'roomId', label: 'Room', type: 'select', options: roomOptions },
      ];
    case 'cable':
      return [
        { key: 'label', label: 'Label', type: 'text' },
        { key: 'colour', label: 'Colour', type: 'color' },
        { key: 'type', label: 'Cable type', type: 'select', options: cableTypes },
        {
          key: 'routing', label: 'Routing', type: 'select',
          options: [
            { value: 'bundled', label: 'Bundled (via rack and tray)' },
            { value: 'direct', label: 'Direct' },
          ],
        },
      ];
  }
}

/** Fills in values that older saved data may not have, so the form shows what they mean. */
function withDefaults(kind: Kind, entity: Record<string, unknown>): Record<string, unknown> {
  if (kind === 'cable') return { routing: 'bundled', ...entity };
  if (kind === 'device' || kind === 'preset') return { mounting: 'both', ...entity };
  return entity;
}

export function Sidebar() {
  const { site, selected, select, run, error, clearError, view, setView } = useApp();
  const [showSchedule, setShowSchedule] = useState(false);

  const entity = selected
    ? (site[siteKeyFor[selected.kind]] as { id: string }[]).find((x) => x.id === selected.id)
    : undefined;

  // Work out which room / rack new things should be added to.
  const device = selected?.kind === 'device' ? site.devices.find((d) => d.id === selected.id) : undefined;
  const rack = site.racks.find((r) => r.id === (selected?.kind === 'rack' ? selected.id : device?.rackId));
  const wallPort = selected?.kind === 'wallPort' ? site.wallPorts.find((w) => w.id === selected.id) : undefined;
  const room =
    site.rooms.find((r) => r.id === (selected?.kind === 'room' ? selected.id : rack?.roomId ?? wallPort?.roomId)) ??
    site.rooms[0];

  async function add(kind: Kind, body: object) {
    const created = await run(() => api.create(collectionFor[kind], body));
    if (created) select({ kind, id: created.id });
  }

  async function save(patch: Record<string, unknown>) {
    if (!selected) return;
    await run(() => api.update(collectionFor[selected.kind], selected.id, patch));
  }

  async function remove() {
    if (!selected) return;
    const what = kindLabel[selected.kind].toLowerCase();
    const extra = selected.kind === 'room' || selected.kind === 'rack' ? ' and everything in it' : '';
    if (!confirm(`Delete this ${what}${extra}?`)) return;
    await run(() => api.remove(collectionFor[selected.kind], selected.id));
    select(null);
  }

  async function saveAsPreset(d: Device) {
    // The hardware model only: serial, asset tag, IP and notes belong to this one unit.
    const { kind, uHeight, mounting, frontPorts, rearPorts, manufacturer, model, psus, powerDraw, outlets, capacity } = d;
    const preset = {
      name: d.model || d.name, kind, uHeight, mounting: mounting ?? 'both', frontPorts, rearPorts, manufacturer, model,
      psus, powerDraw, outlets, capacity,
    };
    const created = await run(() => api.create('presets', preset));
    if (created) select({ kind: 'preset', id: created.id }); // ready to rename
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Rack Viz</h1>
        <div className="header-buttons">
          <ThemeToggle />
          <UndoButtons />
        </div>
      </div>

      <SearchBox />

      <div className="view-toggle four" role="group" aria-label="View">
        {(['front', 'rear', 'both', 'network'] as const).map((v) => (
          <button key={v} className={view === v ? 'active' : ''} aria-pressed={view === v} onClick={() => setView(v)}>
            {{ front: 'Front', rear: 'Rear', both: 'Both', network: 'Network' }[v]}
          </button>
        ))}
      </div>
      {view === 'both' && (
        <p className="view-note">Racks are spaced out automatically in this view, so rooms and racks can't be moved. Devices and cables can still be edited.</p>
      )}
      {view === 'network' && (
        <p className="view-note">What's connected to what, end to end. Patch panels are left out and the layout is automatic (drag to tidy; positions aren't saved). Click a line to see its full cable path.</p>
      )}

      <section className="toolbar">
        <button onClick={() => add('room', {})}>+ Room</button>
        <button disabled={!room} title={room ? `Add to ${room.name}` : 'Add a room first'}
          onClick={() => add('rack', { roomId: room!.id })}>+ Rack</button>
        <button disabled={!room} title={room ? `Add to ${room.name}` : 'Add a room first'}
          onClick={() => add('wallPort', { roomId: room!.id })}>+ Wall port</button>
        <button disabled={!rack} title={rack ? `Add to rack ${rack.name}` : 'Select a rack first'}
          onClick={() => add('device', { rackId: rack!.id })}>+ Device</button>
        <button className="span-2" onClick={() => setShowSchedule(true)}>Print: cables, labels &amp; racks</button>
      </section>
      {showSchedule && <CableSchedule onClose={() => setShowSchedule(false)} />}

      <PresetPalette rack={rack} />
      <VlanPanel />

      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
          <button onClick={clearError} aria-label="Dismiss">×</button>
        </div>
      )}

      {selected && entity ? (
        <section>
          <h2>{kindLabel[selected.kind]}</h2>

          <EntityForm
            key={JSON.stringify(entity)} // reset the form whenever the saved data changes
            entity={withDefaults(selected.kind, entity)}
            fields={fieldsFor(selected.kind, site, entity as Record<string, unknown>)}
            onSave={save}
            onDelete={remove}
          />

          {selected.kind === 'device' && device && (
            <button className="save-preset" onClick={() => saveAsPreset(device)}>Save as preset</button>
          )}
          {selected.kind === 'preset' && (
            <p className="hint">Devices already added from this preset aren't changed when you edit it.</p>
          )}
          {selected.kind === 'cable' && <CablePath cableId={selected.id} />}
          {selected.kind === 'device' && (entity as { kind?: string }).kind === 'patch-panel' && (
            <p className="hint">Each front port is wired through to the rear port with the same number.</p>
          )}
          {selected.kind === 'device' && device && <PowerPanel device={device} />}
          {selected.kind === 'device' && device && device.kind !== 'patch-panel' && device.kind !== 'pdu' && (
            <PortConfigEditor key={`${device.id}:${JSON.stringify(device.portConfig ?? {})}:${JSON.stringify([device.frontPorts, device.rearPorts])}`} device={device} />
          )}
          {selected.kind === 'vlan' && <VlanUsage vlan={entity as Vlan} />}
          {selected.kind !== 'preset' && selected.kind !== 'vlan' && (
            <Attachments key={selected.id} ownerKind={selected.kind} ownerId={selected.id} />
          )}
          {selected.kind === 'device' && <DeviceConnections deviceId={selected.id} />}
          {selected.kind === 'rack' && (
            <ChildList title="Devices" items={site.devices.filter((d) => d.rackId === selected.id)
              .sort((a, b) => b.uPosition - a.uPosition)
              .map((d) => ({ id: d.id, label: `U${d.uPosition} · ${d.name}`, kind: 'device' as const }))} />
          )}
          {selected.kind === 'room' && (
            <ChildList title="Contents" items={[
              ...site.racks.filter((r) => r.roomId === selected.id)
                .map((r) => ({ id: r.id, label: `Rack ${r.name}`, kind: 'rack' as const })),
              ...site.wallPorts.filter((w) => w.roomId === selected.id)
                .map((w) => ({ id: w.id, label: `Wall port ${w.label}`, kind: 'wallPort' as const })),
            ]} />
          )}
        </section>
      ) : (
        <section className="help">
          <p>Click a room, rack, device, wall port or cable to edit it.</p>
          <p>Drag a preset onto a rack to add a device. Drag between two ports to add a cable.</p>
          <p>Drag rooms, racks and devices to move them; select a room to resize it.</p>
        </section>
      )}

      <ImportExportPanel />
      <HistoryPanel />
    </aside>
  );
}

function ChildList({ title, items }: { title: string; items: { id: string; label: string; kind: Kind }[] }) {
  const { select } = useApp();
  if (items.length === 0) return null;
  return (
    <div className="child-list">
      <h3>{title}</h3>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <button className="link" onClick={() => select({ kind: i.kind, id: i.id })}>{i.label}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}