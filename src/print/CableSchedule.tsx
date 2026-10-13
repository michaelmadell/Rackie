import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildSchedule, endName, shortWhere, type Circuit, type ScheduleCable, type ScheduleEnd } from '#shared/schedule';
import { api } from '../app/api';
import { useApp } from '../app/AppContext';
import { RackElevations } from './RackElevations';

const cableTypeLabel = (t: string) => (t.startsWith('cat') ? t.replace('cat', 'Cat') : t.toUpperCase());

/** Every word typed must appear somewhere in the circuit (cable ids, rooms, racks, devices, ports). */
function matches(c: Circuit, words: string[]) {
  const text = c.cables
    .flatMap((x) => [x.id, x.cable.type, ...[x.a, x.b].flatMap((e) => [e.room, e.rack, endName(e)])])
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return words.every((w) => text.includes(w));
}

function End({ e }: { e: ScheduleEnd }) {
  return (
    <>
      <div className={`sched-end${e.isPanel ? ' panel' : ''}`}>
        {e.device ? <><strong>{e.device}</strong> · {e.portName}</> : <strong>Wall port {e.portName}</strong>}
      </div>
      <div className="sched-where">{e.rack ? `${e.room} › ${e.rack} · U${e.u}` : e.room}</div>
    </>
  );
}

function CableId({ x }: { x: ScheduleCable }) {
  return (
    <span className={`sched-id${x.cable.label ? '' : ' unlabelled'}`} title={x.cable.label ? undefined : 'No label yet: use "Number unlabelled cables"'}>
      <span className="swatch" style={{ background: x.cable.colour }} />
      {x.id}
    </span>
  );
}

type Tab = 'schedule' | 'labels' | 'racks';
const titles: Record<Tab, string> = { schedule: 'Cable schedule', labels: 'Cable labels', racks: 'Rack elevations' };

/**
 * Full-page printable views: every cable grouped into circuits (end-to-end connections
 * through patch panels), cut-out labels for each end of each cable, and rack elevations.
 */
export function CableSchedule({ onClose }: { onClose: () => void }) {
  const { site, select, run } = useApp();
  const [tab, setTab] = useState<Tab>('schedule');
  const [roomId, setRoomId] = useState('');
  const [query, setQuery] = useState('');
  const [openedAt] = useState(() => new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }));

  const all = useMemo(() => buildSchedule(site), [site]);
  const circuits = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter(
      (c) => (!roomId || c.cables.some((x) => x.a.port.roomId === roomId || x.b.port.roomId === roomId)) && matches(c, words),
    );
  }, [all, roomId, query]);
  const cables = circuits.flatMap((c) => c.cables);
  const unlabelled = site.cables.filter((c) => !c.label).length;
  const roomName = site.rooms.find((r) => r.id === roomId)?.name;

  // Racks: in the chosen room, and matching the filter by rack or device name.
  const racks = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const roomOrder = new Map(site.rooms.map((r, i) => [r.id, i]));
    return site.racks
      .filter((r) => !roomId || r.roomId === roomId)
      .filter((r) => {
        const text = [r.name, ...site.devices.filter((d) => d.rackId === r.id).map((d) => d.name)].join(' ').toLowerCase();
        return words.every((w) => text.includes(w));
      })
      .sort((a, b) => roomOrder.get(a.roomId)! - roomOrder.get(b.roomId)! || a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [site, roomId, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function show(x: ScheduleCable) {
    select({ kind: 'cable', id: x.cable.id });
    onClose();
  }

  return createPortal(
    <div className="schedule" role="dialog" aria-label="Cable schedule">
      <div className="schedule-controls">
        <div className="view-toggle" role="group" aria-label="Show">
          {(['schedule', 'labels', 'racks'] as const).map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t === 'schedule' ? 'Cables' : t === 'labels' ? 'Labels' : 'Racks'}
            </button>
          ))}
        </div>
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} aria-label="Room">
          <option value="">All rooms</option>
          {site.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input type="search" placeholder="Filter…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Filter cables" />
        <span className="spacer" />
        {unlabelled > 0 && tab !== 'racks' && (
          <button onClick={() => run(() => api.numberCables())} title="Labels them C001, C002… in schedule order. Undoable.">
            Number {unlabelled} unlabelled cable{unlabelled === 1 ? '' : 's'}
          </button>
        )}
        <a className="button" href={api.exportUrl(tab === 'racks' ? 'devices' : 'schedule')} download>Download CSV</a>
        <button type="submit" onClick={() => window.print()}>Print</button>
        <button onClick={onClose} aria-label="Close">✕</button>
      </div>

      <header className="schedule-header">
        <h1>{titles[tab]}{roomName ? ` · ${roomName}` : ''}</h1>
        <p>
          {tab === 'racks'
            ? `${racks.length} rack${racks.length === 1 ? '' : 's'}, one per printed page`
            : `${cables.length} cable${cables.length === 1 ? '' : 's'} · ${circuits.length} circuit${circuits.length === 1 ? '' : 's'}`}
          {query && ` matching “${query}”`} · {openedAt}
        </p>
      </header>

      {tab === 'racks' ? (
        <RackElevations site={site} racks={racks} />
      ) : tab === 'schedule' ? (
        <table className="schedule-table">
          <thead>
            <tr><th>#</th><th>Cable</th><th>From</th><th aria-label="to" /><th>To</th><th>Type</th></tr>
          </thead>
          {circuits.map((c) => (
            // One tbody per circuit, so a circuit isn't split across printed pages.
            <tbody key={c.cables[0].cable.id} className={c.cables.length > 1 ? 'multi' : ''}>
              {c.cables.map((x, i) => (
                <tr key={x.cable.id} onClick={() => show(x)} title="Show on the plan">
                  {i === 0 && (
                    <td rowSpan={c.cables.length} className="sched-circuit">
                      {c.number}
                      {c.panels > 0 && <div className="sched-via">via {c.panels} panel{c.panels === 1 ? '' : 's'}</div>}
                    </td>
                  )}
                  <td><CableId x={x} /></td>
                  <td><End e={x.a} /></td>
                  <td className="sched-arrow">→</td>
                  <td><End e={x.b} /></td>
                  <td>{x.cable.type ? cableTypeLabel(x.cable.type) : ''}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      ) : (
        <div className="cable-tags">
          {cables.flatMap((x) =>
            [[x.a, x.b], [x.b, x.a]].map(([here, there], i) => (
              <div className="cable-tag" key={`${x.cable.id}-${i}`}>
                <div className="tag-id">
                  <span className="swatch" style={{ background: x.cable.colour }} />
                  {x.id}
                </div>
                <div className="tag-here">{shortWhere(here)} · {endName(here)}</div>
                <div className="tag-there">→ {shortWhere(there)} · {endName(there)}</div>
              </div>
            )),
          )}
        </div>
      )}
      {(tab === 'racks' ? racks.length === 0 : circuits.length === 0) && (
        <p className="hint">No {tab === 'racks' ? 'racks' : 'cables'} match.</p>
      )}
    </div>,
    document.body,
  );
}