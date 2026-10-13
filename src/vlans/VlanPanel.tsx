import { useMemo } from 'react';
import type { Vlan } from '#shared/schema';
import { devicePortId, indexPorts } from '#shared/ports';
import { makeVlans, MISMATCH, NO_VLAN, TRUNK } from '#shared/vlans';
import { api } from '../app/api';
import { useApp } from '../app/AppContext';

/** Sidebar list of VLANs. Click one to edit it and highlight every cable carrying it. */
export function VlanPanel() {
  const { site, selected, select, run, colourBy, setColourBy } = useApp();
  const vlans = useMemo(() => makeVlans(site), [site]);
  const sorted = [...site.vlans].sort((a, b) => a.vid - b.vid);

  async function add() {
    const created = await run(() => api.create('vlans', {}));
    if (created) select({ kind: 'vlan', id: created.id });
  }

  return (
    <details className="vlan-panel">
      <summary>VLANs ({site.vlans.length})</summary>
      <ul className="vlan-list">
        {sorted.map((v) => (
          <li key={v.id}>
            <button className={`vlan-item${selected?.kind === 'vlan' && selected.id === v.id ? ' active' : ''}`}
              onClick={() => select({ kind: 'vlan', id: v.id })}>
              <span className="vlan-swatch" style={{ background: v.colour }} />
              <span className="vlan-vid">{v.vid}</span>
              <span className="vlan-name">{v.name}</span>
              <span className="hint">{vlans.portsWith(v.vid).length} ports</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="vlan-actions">
        <button onClick={add}>+ VLAN</button>
        <label>
          <input type="checkbox" checked={colourBy === 'vlan'} onChange={(e) => setColourBy(e.target.checked ? 'vlan' : 'cable')} />
          Colour cables by VLAN
        </label>
      </div>
      {colourBy === 'vlan' && (
        <p className="vlan-legend">
          <span><i style={{ background: TRUNK }} /> trunk</span>
          <span><i style={{ background: NO_VLAN }} /> no VLAN</span>
          <span><i style={{ background: MISMATCH }} /> ends disagree</span>
        </p>
      )}
    </details>
  );
}

/** Under a selected VLAN's form: every port it's set on. */
export function VlanUsage({ vlan }: { vlan: Vlan }) {
  const { site, select } = useApp();
  const used = useMemo(() => {
    const ports = indexPorts(site);
    return makeVlans(site).portsWith(vlan.vid).map((u) => {
      const id = u.key.startsWith('r') ? devicePortId(u.device.id, Number(u.key.slice(1)), 'rear') : devicePortId(u.device.id, Number(u.key));
      return { ...u, name: ports.get(id)?.name ?? u.key };
    });
  }, [site, vlan.vid]);

  if (used.length === 0) return <p className="hint">Not set on any ports yet. Set it from a device's "Ports &amp; VLANs" list.</p>;
  return (
    <div className="child-list">
      <h3>Used on {used.length} port{used.length === 1 ? '' : 's'}</h3>
      <ul>
        {used.map((u) => (
          <li key={`${u.device.id}:${u.key}`}>
            <button className="link" onClick={() => select({ kind: 'device', id: u.device.id })}>
              {u.device.name} · {u.name}
            </button>
            {u.tagged && <span className="hint"> tagged</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}