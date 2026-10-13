import { Fragment, useMemo } from 'react';
import type { PortRef } from '#shared/ports';
import { makeTracer } from '#shared/trace';
import { useApp } from '../app/AppContext';
import { compatibilityWarning } from '#shared/portGroups';
import { makeVlans } from '#shared/vlans';

/** "Server Room A › A1 › Core Switch › port 7" → main "Core Switch · port 7", where "Server Room A › A1". */
function splitLabel(port: PortRef) {
  const parts = port.label.split(' › ');
  return port.kind === 'wall'
    ? { main: parts[1], where: parts[0] }
    : { main: `${parts[2]} · ${parts[3]}`, where: `${parts[0]} › ${parts[1]}` };
}

const cableTypeLabel = (t: string) => (t.startsWith('cat') ? t.replace('cat', 'Cat') : t.toUpperCase());

/** Port types that don't normally plug together (both ends must be device ports with a type). */
const warningFor = (a: PortRef, b: PortRef) =>
    a.portType && b.portType ? compatibilityWarning(a.portType, b.portType) : null;

function PortRow({ port }: { port: PortRef }) {
  const { select } = useApp();
  const { main, where } = splitLabel(port);
  return (
    <li className="path-port">
      <button
        className="link"
        onClick={() => select(port.kind === 'wall' ? { kind: 'wallPort', id: port.id } : { kind: 'device', id: port.deviceId! })}
      >
        {main}
      </button>
      <span className="path-where">{where}</span>
    </li>
  );
}

/** The selected cable's whole route, end to end, through any patch panels. */
export function CablePath({ cableId }: { cableId: string }) {
  const { site, select } = useApp();
  const path = useMemo(() => makeTracer(site).trace(cableId), [site, cableId]);
  const vlans = useMemo(() => makeVlans(site), [site]);
  if (!path) return null;
  const panels = path.hops.length - 1;
  const vlan = vlans.forCable(cableId);

  return (
    <div className="path">
      <h3>Path{panels > 0 ? ` · through ${panels} patch panel${panels > 1 ? 's' : ''}` : ''}</h3>
      <p className={`path-vlan${vlan?.mismatch ? ' mismatch' : ''}`}>
        {vlans.describe(cableId)}
        {vlan?.mismatch && <> · ⚠ VLAN mismatch: {vlan.mismatch}</>}
      </p>
      <ol>
        {path.hops.map((hop, i) => (
          <Fragment key={hop.cable.id}>
            {/* Between cables: the two sides of a patch panel. */}
            {i > 0 && <li className="path-through">⇄ wired through to</li>}
            <PortRow port={hop.from} />
            <li className={`path-cable${hop.cable.id === cableId ? ' current' : ''}`}>
              <span className="swatch" style={{ background: hop.cable.colour }} />
              <button className="link" onClick={() => select({ kind: 'cable', id: hop.cable.id })}>
                {hop.cable.label || 'cable'}
              </button>
              {hop.cable.type && <span className="path-where">{cableTypeLabel(hop.cable.type)}</span>}
            </li>
            {warningFor(hop.from, hop.to) && <li className="path-warning">⚠ {warningFor(hop.from, hop.to)}</li>}
            <PortRow port={hop.to} />
          </Fragment>
        ))}
      </ol>
    </div>
  );
}

/** For a selected device: what each of its connected ports ultimately reaches. */
export function DeviceConnections({ deviceId }: { deviceId: string }) {
  const { site, select } = useApp();
  const rows = useMemo(() => {
    const { ports, cableAt, trace } = makeTracer(site);
    return [...ports.values()]
      .filter((p) => p.deviceId === deviceId && cableAt.has(p.id))
      .map((p) => {
        const cable = cableAt.get(p.id)!;
        const path = trace(cable.id)!;
        // This port is one end of the path, or (for a patch panel) somewhere in the middle.
        const far =
          path.start.id === p.id ? [path.end] : path.end.id === p.id ? [path.start] : [path.start, path.end];
        return { port: p, cable, far, panels: path.hops.length - 1 };
      });
  }, [site, deviceId]);

  if (rows.length === 0) return null;
  return (
    <div className="path">
      <h3>Connections</h3>
      <ul className="connections">
        {rows.map(({ port, cable, far, panels }) => (
          <li key={port.id}>
            <button className="link" onClick={() => select({ kind: 'cable', id: cable.id })}>
              {port.name}
            </button>
            <span>
              {far.length === 2 ? '' : '→ '}
              {far.map((f) => splitLabel(f).main).join(' ⇄ ')}
              {panels > 0 && far.length === 1 && (
                <span className="path-where"> via {panels} panel{panels > 1 ? 's' : ''}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}