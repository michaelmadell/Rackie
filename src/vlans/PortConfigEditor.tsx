import { useMemo, useState } from 'react';
import type { Device, PortConfig } from '#shared/schema';
import { expandPorts } from '#shared/portGroups';
import { devicePortId } from '#shared/ports';
import { makeTracer } from '#shared/trace';
import { formatVids, parseVids, portKey } from '#shared/vlans';
import { api } from '../app/api';
import { useApp } from '../app/AppContext';

type Row = { key: string; name: string; farEnd?: string };
type Draft = { description: string; vlan: string; tagged: string };

const toDraft = (c?: PortConfig): Draft => ({
  description: c?.description ?? '',
  vlan: c?.vlan ? String(c.vlan) : '',
  tagged: formatVids(c?.tagged ?? []),
});

/** Draft → saved settings; empty settings are left out. Throws if a tagged list doesn't parse. */
function toConfig(d: Draft): PortConfig | undefined {
  const tagged = parseVids(d.tagged.replace(/–/g, '-'));
  const c: PortConfig = {
    ...(d.description.trim() ? { description: d.description.trim() } : {}),
    ...(d.vlan ? { vlan: Number(d.vlan) } : {}),
    ...(tagged.length ? { tagged } : {}),
  };
  return Object.keys(c).length ? c : undefined;
}

/** Per-port description and VLANs for a device, with "apply to selected ports". */
export function PortConfigEditor({ device }: { device: Device }) {
  const { site, run } = useApp();

  const rows = useMemo<Row[]>(() => {
    const { ports, cableAt, trace } = makeTracer(site);
    // What each port ultimately reaches, through any patch panels.
    const farEnd = (id: string) => {
      const cable = cableAt.get(id);
      const path = cable && trace(cable.id);
      if (!path) return undefined;
      const end = path.start.id === id ? path.end : path.end.id === id ? path.start : undefined;
      return end?.label.split(' › ').slice(-2).join(' ');
    };
    return (['front', 'rear'] as const).flatMap((face) =>
      expandPorts(face === 'front' ? device.frontPorts : device.rearPorts).map((p) => {
        const id = devicePortId(device.id, p.number, face);
        return { key: portKey(id), name: ports.get(id)?.name ?? `port ${p.number}`, farEnd: farEnd(id) };
      }),
    );
  }, [site, device]);

  const saved = useMemo(() => Object.fromEntries(rows.map((r) => [r.key, toDraft(device.portConfig?.[r.key])])), [rows, device]);
  const [draft, setDraft] = useState<Record<string, Draft>>(saved);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [lastPicked, setLastPicked] = useState<number | null>(null);
  const [bulk, setBulk] = useState<{ vlan: string; tagged: string }>({ vlan: 'keep', tagged: '' });

  const errors = Object.fromEntries(
    rows.flatMap((r) => {
      try {
        toConfig(draft[r.key]);
        return [];
      } catch (e) {
        return [[r.key, (e as Error).message]];
      }
    }),
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const configured = rows.filter((r) => saved[r.key].vlan || saved[r.key].tagged || saved[r.key].description).length;
  const vlans = [...site.vlans].sort((a, b) => a.vid - b.vid);

  const set = (key: string, patch: Partial<Draft>) => setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));

  function pick(i: number, shift: boolean) {
    const next = new Set(picked);
    const on = !picked.has(rows[i].key);
    // Shift-click selects (or clears) the whole range since the last click.
    const [from, to] = shift && lastPicked !== null ? [Math.min(lastPicked, i), Math.max(lastPicked, i)] : [i, i];
    for (let j = from; j <= to; j++) {
      if (on) next.add(rows[j].key);
      else next.delete(rows[j].key);
    }
    setPicked(next);
    setLastPicked(i);
  }

  function applyBulk() {
    setDraft((d) => {
      const out = { ...d };
      for (const key of picked) {
        out[key] = {
          ...out[key],
          ...(bulk.vlan !== 'keep' ? { vlan: bulk.vlan } : {}),
          ...(bulk.tagged.trim() ? { tagged: bulk.tagged.trim() === '-' ? '' : bulk.tagged.trim() } : {}),
        };
      }
      return out;
    });
  }

  function save() {
    const portConfig = Object.fromEntries(rows.flatMap((r) => {
      const c = toConfig(draft[r.key]);
      return c ? [[r.key, c]] : [];
    }));
    run(() => api.update('devices', device.id, { portConfig }));
  }

  // A port's VLAN may not be in the VLAN list; still show it.
  const vlanOptions = (current: string) => [
    ...vlans.map((v) => ({ value: String(v.vid), label: `${v.vid} ${v.name}` })),
    ...(current && !vlans.some((v) => String(v.vid) === current) ? [{ value: current, label: `${current} (not in list)` }] : []),
  ];

  if (rows.length === 0) return null;

  return (
    <details className="port-config">
      <summary>Ports &amp; VLANs <span className="hint">({configured} of {rows.length} set)</span></summary>

      {picked.size > 0 && (
        <div className="port-bulk">
          <span>{picked.size} selected:</span>
          <select value={bulk.vlan} onChange={(e) => setBulk((b) => ({ ...b, vlan: e.target.value }))} aria-label="Untagged VLAN for selected ports">
            <option value="keep">VLAN unchanged</option>
            <option value="">No VLAN</option>
            {vlans.map((v) => <option key={v.id} value={v.vid}>{v.vid} {v.name}</option>)}
          </select>
          <input placeholder="tagged, e.g. 10,20" value={bulk.tagged} onChange={(e) => setBulk((b) => ({ ...b, tagged: e.target.value }))}
            title='Tagged VLANs for selected ports; leave blank to keep, "-" to clear' aria-label="Tagged VLANs for selected ports" />
          <button type="button" onClick={applyBulk}>Apply</button>
          <button type="button" className="link" onClick={() => setPicked(new Set())}>Clear</button>
        </div>
      )}

      <ul className="port-rows">
        {rows.map((r, i) => {
          const d = draft[r.key];
          return (
            <li key={r.key} className={picked.has(r.key) ? 'picked' : ''}>
              <div className="port-row-top">
                <input type="checkbox" checked={picked.has(r.key)} onChange={() => {}} onClick={(e) => pick(i, e.shiftKey)}
                  aria-label={`Select ${r.name}`} />
                <span className="port-row-name" title={r.farEnd ? `→ ${r.farEnd}` : 'Not connected'}>
                  {r.name}
                  {r.farEnd && <span className="port-row-far"> → {r.farEnd}</span>}
                </span>
                <select value={d.vlan} onChange={(e) => set(r.key, { vlan: e.target.value })} aria-label={`${r.name} untagged VLAN`}>
                  <option value="">–</option>
                  {vlanOptions(d.vlan).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input className={errors[r.key] ? 'invalid' : ''} placeholder="tagged" value={d.tagged}
                  onChange={(e) => set(r.key, { tagged: e.target.value })} title={errors[r.key] ?? 'Tagged VLANs, e.g. 10,20,30-35'}
                  aria-label={`${r.name} tagged VLANs`} />
              </div>
              <input className="port-row-desc" placeholder="description" value={d.description}
                onChange={(e) => set(r.key, { description: e.target.value })} aria-label={`${r.name} description`} />
            </li>
          );
        })}
      </ul>

      <div className="form-actions">
        <button type="submit" disabled={!dirty || Object.keys(errors).length > 0} onClick={save}>Save ports</button>
        <button type="button" disabled={!dirty} onClick={() => setDraft(saved)}>Revert</button>
      </div>
      {Object.values(errors)[0] && <p className="power-warning">⚠ {Object.values(errors)[0]}</p>}
      <p className="hint">Untagged = the access (or native) VLAN. Any tagged VLANs make the port a trunk.</p>
    </details>
  );
}