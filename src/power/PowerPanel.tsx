import { useMemo } from 'react';
import type { Device } from '#shared/schema';
import { feedOf, formatWatts, makePower } from '#shared/power';
import { api } from '../app/api';
import { useApp } from '../app/AppContext';

/** A bar showing load against capacity: amber over 80%, red over 100%. */
function LoadBar({ value, worst, capacity }: { value: number; worst: number; capacity?: number }) {
  if (!capacity) return null;
  const pct = (w: number) => Math.min(100, (w / capacity) * 100);
  const level = worst > capacity ? 'over' : worst > capacity * 0.8 ? 'high' : 'ok';
  return (
    <div className={`load-bar ${level}`} title={`${formatWatts(value)} normally, ${formatWatts(worst)} if another feed fails`}>
      <div className="load-worst" style={{ width: `${pct(worst)}%` }} />
      <div className="load-normal" style={{ width: `${pct(value)}%` }} />
    </div>
  );
}

/** Sidebar power section: a PDU's outlets and load, or a device's PSUs and where they're plugged in. */
export function PowerPanel({ device }: { device: Device }) {
  const { site, run, select } = useApp();
  const power = useMemo(() => makePower(site), [site]);
  const byId = useMemo(() => new Map(site.devices.map((d) => [d.id, d])), [site]);

  if (device.kind === 'pdu') {
    const load = power.forPdu(device);
    const links = power.pduLinks(device.id);
    return (
      <div className="power">
        <h3>Power · feed {feedOf(device)}</h3>
        <p className="power-load">
          <strong>{formatWatts(load.normal)}</strong>
          {load.worst > load.normal && <> (up to {formatWatts(load.worst)} if another feed fails)</>}
          {load.capacity ? <> of {formatWatts(load.capacity)}</> : <span className="hint"> · set a capacity to check for overload</span>}
        </p>
        <LoadBar value={load.normal} worst={load.worst} capacity={load.capacity} />
        <ol className="outlets">
          {Array.from({ length: device.outlets ?? 0 }, (_, i) => {
            const link = links.find((l) => l.outlet === i + 1);
            const d = link && byId.get(link.device);
            return (
              <li key={i} className={d ? 'used' : ''}>
                <span className="outlet-n">{i + 1}</span>
                {d ? (
                  <button className="link" onClick={() => select({ kind: 'device', id: d.id })}>
                    {d.name} · PSU {link!.psu}
                  </button>
                ) : (
                  <span className="hint">free</span>
                )}
              </li>
            );
          })}
        </ol>
        {!device.outlets && <p className="hint">Set the number of outlets above to plug devices in.</p>}
      </div>
    );
  }

  if (device.kind === 'patch-panel') return null; // passive: no power

  // No power supplies recorded yet (e.g. added before power existed): offer to set them here.
  if (!device.psus) {
    return (
      <div className="power">
        <h3>Power</h3>
        <p className="hint">How many power supplies does {device.name} have?</p>
        <div className="psu-count">
          {[1, 2, 4].map((n) => (
            <button key={n} onClick={() => run(() => api.update('devices', device.id, { psus: n }))}>
              {n} PSU{n > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      </div>
    );
  }
  const info = power.forDevice(device);

  // PDUs in the same room, nearest first (same rack, then the rest of the room).
  const roomId = site.racks.find((r) => r.id === device.rackId)?.roomId;
  const pdus = site.devices
    .filter((d) => d.kind === 'pdu' && site.racks.find((r) => r.id === d.rackId)?.roomId === roomId)
    .sort((a, b) => Number(b.rackId === device.rackId) - Number(a.rackId === device.rackId) || a.name.localeCompare(b.name));
  const taken = new Set(site.powerLinks.map((l) => `${l.pdu}:${l.outlet}`));

  function plug(psu: number, value: string) {
    const existing = info.psus[psu - 1].link;
    if (!value) return existing && run(() => api.remove('power-links', existing.id));
    const [pdu, outlet] = [value.slice(0, value.lastIndexOf(':')), Number(value.slice(value.lastIndexOf(':') + 1))];
    return run(() =>
      existing
        ? api.update('power-links', existing.id, { pdu, outlet })
        : api.create('power-links', { device: device.id, psu, pdu, outlet }),
    );
  }

  return (
    <div className="power">
      <h3>Power{device.powerDraw ? ` · ${formatWatts(device.powerDraw)}` : ''}</h3>
      {info.psus.map((p) => (
        <label key={p.psu} className="psu-row">
          <span>PSU {p.psu}</span>
          <select value={p.link ? `${p.link.pdu}:${p.link.outlet}` : ''} onChange={(e) => plug(p.psu, e.target.value)}>
            <option value="">Not plugged in</option>
            {pdus.map((pdu) => (
              <optgroup key={pdu.id} label={`${pdu.name} · feed ${feedOf(pdu)}${pdu.rackId === device.rackId ? '' : ` · rack ${site.racks.find((r) => r.id === pdu.rackId)?.name}`}`}>
                {!pdu.outlets && <option disabled>{pdu.name}: no outlets set</option>}
                {Array.from({ length: pdu.outlets ?? 0 }, (_, i) => {
                  const value = `${pdu.id}:${i + 1}`;
                  const mine = p.link && `${p.link.pdu}:${p.link.outlet}` === value;
                  return (
                    <option key={value} value={value} disabled={taken.has(value) && !mine}>
                      {pdu.name} outlet {i + 1}{taken.has(value) && !mine ? ' (in use)' : ''}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        </label>
      ))}
            {pdus.length === 0 && <p className="hint">There are no PDUs in this room yet. Drag a PDU preset onto a rack, then pick its outlets here.</p>}
      {info.warnings.map((w) => <p key={w} className="power-warning">⚠ {w}</p>)}
    </div>
  );
}