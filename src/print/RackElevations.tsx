import type { CSSProperties } from 'react';
import type { Device, Rack, Site } from '#shared/schema';
import { facesOf, topU, type Face } from '#shared/units';
import { totalPorts } from '#shared/portGroups';
import { formatWatts, makePower } from '#shared/power';

const kindLabel: Record<Device['kind'], string> = {
  server: 'Server', switch: 'Switch', 'patch-panel': 'Patch panel', pdu: 'PDU', other: 'Other',
};
const mountingLabel = { front: 'front only', rear: 'rear only' } as const;

/** One face of a rack, drawn U by U from the top, like a rack elevation drawing. */
function Face({ rack, devices, face }: { rack: Rack; devices: Device[]; face: Face }) {
  const rowOf = (d: Device) => ({ gridRow: `${rack.uHeight - topU(d) + 1} / span ${d.uHeight}` });
  const onFace = devices.filter((d) => facesOf(d).includes(face));
  // Half-depth devices on the other face, shown faintly where nothing on this face covers them.
  const behind = devices.filter(
    (d) => !facesOf(d).includes(face) && !onFace.some((o) => o.uPosition <= topU(d) && d.uPosition <= topU(o)),
  );

  return (
    <div className="elev-face">
      <h3>{face === 'front' ? 'Front' : 'Rear'}</h3>
      <div className="elev-grid" style={{ '--rows': rack.uHeight } as CSSProperties}>
        {Array.from({ length: rack.uHeight }, (_, i) => (
          <div key={i} className="elev-u" style={{ gridRow: i + 1 }}>
            <span>{rack.uHeight - i}</span>
          </div>
        ))}
        {behind.map((d) => (
          <div key={d.id} className="elev-device behind" style={rowOf(d)}>
            <span className="elev-name">{d.name}</span>
            <span className="elev-meta">{face === 'front' ? 'rear' : 'front'}-mounted</span>
          </div>
        ))}
        {onFace.map((d) => (
          <div key={d.id} className={`elev-device kind-${d.kind}`} style={rowOf(d)}>
            <span className="elev-name">{d.name}</span>
            {d.assetTag && <span className="elev-tag">{d.assetTag}</span>}
            {d.uHeight > 1 && (
              <span className="elev-meta">{[d.manufacturer, d.model].filter(Boolean).join(' ') || kindLabel[d.kind]}{d.ip ? ` · ${d.ip}` : ''}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A rack's door sheet: front and rear elevations, then the device list. */
function RackSheet({ site, rack, cabled }: { site: Site; rack: Rack; cabled: Set<string> }) {
  const room = site.rooms.find((r) => r.id === rack.roomId);
  const devices = site.devices.filter((d) => d.rackId === rack.id).sort((a, b) => topU(b) - topU(a));
  const usedU = new Set(devices.flatMap((d) => Array.from({ length: d.uHeight }, (_, i) => d.uPosition + i))).size;
  const power = makePower(site);
  const rackPower = power.forRack(rack.id);
  // Watts drawn, and which feeds the PSUs are on; PDUs show their feed and load.
  const powerCell = (d: Device) => {
    if (d.kind === 'pdu') {
      const load = power.forPdu(d);
      return `Feed ${d.feed || '?'} · ${formatWatts(load.normal)}${load.capacity ? ` / ${formatWatts(load.capacity)}` : ''}`;
    }
    if (!d.psus && !d.powerDraw) return '';
    const feeds = power.forDevice(d).psus.map((p) => p.feed ?? '–').join('+');
    return [d.powerDraw ? formatWatts(d.powerDraw) : '', feeds && `(${feeds})`].filter(Boolean).join(' ');
  };
  const connected = (d: Device) => {
    const total = totalPorts(d.frontPorts) + totalPorts(d.rearPorts);
    const used = [...cabled].filter((p) => p.startsWith(`${d.id}:`)).length;
    return total ? `${used}/${total}` : '–';
  };

  return (
    <section className="rack-sheet">
      <header className="rack-sheet-header">
        <h2>Rack {rack.name}</h2>
        <p>
          {room?.name} · {rack.uHeight}U · {usedU}U used, {rack.uHeight - usedU}U free · {devices.length} device{devices.length === 1 ? '' : 's'}
          {rackPower.draw > 0 && ` · ${formatWatts(rackPower.draw)}`}
          {rackPower.feeds.map((f) => ` · feed ${f.feed} ${formatWatts(f.normal)}${f.capacity ? `/${formatWatts(f.capacity)}` : ''}`).join('')}
        </p>
        {rackPower.warnings.map((w) => <p key={w} className="power-warning">⚠ {w}</p>)}
      </header>

      <div className="elev-faces">
        <Face rack={rack} devices={devices} face="front" />
        <Face rack={rack} devices={devices} face="rear" />
      </div>

      {devices.length > 0 && (
        <table className="rack-devices">
          <thead>
            <tr><th>U</th><th>Device</th><th>Type</th><th>Model</th><th>Serial</th><th>Asset tag</th><th>IP</th><th>Cabled</th><th>Power</th></tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td>{d.uHeight > 1 ? `${topU(d)}–${d.uPosition}` : d.uPosition}</td>
                <td>
                  <strong>{d.name}</strong>
                  {d.mounting && d.mounting !== 'both' && <span className="rack-devices-note"> ({mountingLabel[d.mounting]})</span>}
                  {d.notes && <div className="rack-devices-note">{d.notes}</div>}
                </td>
                <td>{kindLabel[d.kind]}</td>
                <td>{[d.manufacturer, d.model].filter(Boolean).join(' ')}</td>
                <td>{d.serial}</td>
                <td>{d.assetTag}</td>
                <td>{d.ip}</td>
                <td>{connected(d)}</td>
                <td>{powerCell(d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Printable rack elevations, one rack per printed page. */
export function RackElevations({ site, racks }: { site: Site; racks: Rack[] }) {
  const cabled = new Set(site.cables.flatMap((c) => [c.a, c.b]));
  return (
    <div className="rack-sheets">
      {racks.map((r) => <RackSheet key={r.id} site={site} rack={r} cabled={cabled} />)}
    </div>
  );
}