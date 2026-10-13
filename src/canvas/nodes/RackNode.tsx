import { useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { formatWatts, makePower } from '#shared/power';
import type { Device, Rack } from '#shared/schema';
import type { RackNodeType } from '../buildGraph';
import { devicePortId } from '#shared/ports';
import { facesOf, overlaps, topU, type Face } from '#shared/units';
import { expandPorts, portTypeLabel } from '#shared/portGroups';
import { formatVids } from '#shared/vlans';
import { useApp } from '../../app/AppContext';
import { useDeviceDrag } from '../useDeviceDrag';
import { deviceHeight, FACE_GAP, FACE_W, PORT_GAP, portGrid, rackWidth, U_PX } from '../layout';

/** CSS top/height for something occupying uPosition..uPosition+uHeight-1 in this rack. */
const place = (rackHeight: number, uPosition: number, uHeight: number) => ({
  top: (rackHeight - (uPosition + uHeight - 1)) * U_PX,
  height: deviceHeight(uHeight),
});

const faceName = (f: Face) => (f === 'front' ? 'Front' : 'Rear');

export function RackNode({ data }: NodeProps<RackNodeType>) {
  const { rack, devices, faces, hiddenCables } = data;
  const otherFace: Face = faces[0] === 'front' ? 'rear' : 'front';
  const { site } = useApp();
  const power = useMemo(() => makePower(site).forRack(rack.id), [site, rack.id]);
  const powerTitle = [
    `Draw ${formatWatts(power.draw)}`,
    ...power.feeds.map((f) => `Feed ${f.feed}: ${formatWatts(f.normal)}${f.capacity ? ` of ${formatWatts(f.capacity)}` : ''}`),
    ...power.warnings.map((w) => `⚠ ${w}`),
  ].join('\n');

  return (
    <div className="rack" style={{ width: rackWidth(faces.length) }}>
      <div className="rack-header">
        <span>
          Rack {rack.name}
          {faces.length === 1 && <span className="face-name"> · {faceName(faces[0])}</span>}
        </span>
        {(power.draw > 0 || power.feeds.length > 0) && (
          <span className={`rack-badge power-badge${power.warnings.length ? ' warn' : ''}`} title={powerTitle}>
            ⚡ {formatWatts(power.draw)}{power.warnings.length ? ' ⚠' : ''}
          </span>
        )}
        {hiddenCables > 0 && (
          <span className="rack-badge" title={`Switch to the ${faceName(otherFace)} or Both view to see them`}>
            {hiddenCables} cable{hiddenCables > 1 ? 's' : ''} on {faceName(otherFace).toLowerCase()}
          </span>
        )}
      </div>
      <div className="rack-faces" style={{ gap: FACE_GAP }}>
        {faces.map((face) => (
          <div key={face}>
            {faces.length > 1 && <div className="face-label">{faceName(face)}</div>}
            <RackFace rack={rack} devices={devices} face={face} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** One elevation of a rack. Devices not mounted on this face are drawn as faint outlines. */
function RackFace({ rack, devices, face }: { rack: Rack; devices: Device[]; face: Face }) {
  const { site, selected, select, drag } = useApp();
  const power = useMemo(() => makePower(site), [site]);
  const startDeviceDrag = useDeviceDrag();

  // Drop preview, if a device that shows on this face is being dragged over this rack.
  const target = drag?.target?.rackId === rack.id && drag.faces.includes(face) ? drag.target : null;

  return (
    <div
      className={`rack-body${target ? ' drop-over' : ''}`}
      data-rack-id={rack.id}
      style={{ width: FACE_W, height: rack.uHeight * U_PX }}
    >
      {/* U numbers down the left side, top = highest U */}
      {Array.from({ length: rack.uHeight }, (_, i) => (
        <div key={i} className="u-label" style={{ top: i * U_PX, height: U_PX }}>
          {rack.uHeight - i}
        </div>
      ))}

      {devices.map((d) => {
        const onThisFace = facesOf(d).includes(face);
        // Outline for a device on the other face only, unless a device on this face fills that U.
        if (!onThisFace && devices.some((o) => facesOf(o).includes(face) && overlaps(o, d))) return null;

        const isSelected = selected?.kind === 'device' && selected.id === d.id;
        const selectDevice = (e: React.MouseEvent) => {
          e.stopPropagation(); // select the device, not the rack
          select({ kind: 'device', id: d.id });
        };

        if (!onThisFace) {
          // Mounted on the other face only: show that the U is taken, but no ports.
          return (
            <div
              key={d.id}
              className={`device device-ghost nodrag nopan${isSelected ? ' selected' : ''}`}
              data-device-id={d.id}
              style={place(rack.uHeight, d.uPosition, d.uHeight)}
              title={`${d.name} (${faceName(facesOf(d)[0]).toLowerCase()}-mounted)`}
              onClick={selectDevice}
            >
              <span className="device-name">{d.name} ({faceName(facesOf(d)[0]).toLowerCase()})</span>
            </div>
          );
        }

        const ports = expandPorts(face === 'front' ? d.frontPorts : d.rearPorts);
        const grid = portGrid(d.uHeight, ports.length);
        const model = [d.manufacturer, d.model].filter(Boolean).join(' ');
        const powerWarnings = d.psus ? power.forDevice(d).warnings.map((w) => `⚠ ${w}`) : [];
        return (
          <div
            key={d.id}
            // "nodrag" stops React Flow dragging the rack and "nopan" stops it panning the canvas
            // when a device is grabbed (React Flow only adds "nopan" itself to draggable nodes,
            // and racks aren't draggable in the Both view).
            className={`device device-${d.kind} nodrag nopan${isSelected ? ' selected' : ''}${drag?.deviceId === d.id ? ' dragging' : ''}`}
            data-device-id={d.id}
            style={place(rack.uHeight, d.uPosition, d.uHeight)}
            onPointerDown={(e) => startDeviceDrag(e, d, rack)}
            onClick={selectDevice}
          >
            <span className="device-name" title={[d.name, model, d.ip, ...powerWarnings].filter(Boolean).join('\n')}>
              {d.name}
              {powerWarnings.length > 0 && <span className="power-flag" aria-label="Power warning">⚡!</span>}
            </span>
            <div
              className="ports"
              style={{ gridTemplateColumns: `repeat(${grid.columns}, ${grid.portW}px)`, gap: PORT_GAP }}
            >
              {ports.map((p) => {
                const cfg = d.portConfig?.[face === 'rear' ? `r${p.number}` : String(p.number)];
                const title = [
                  `${d.name} · ${p.name ?? `${face === 'rear' ? 'rear ' : ''}port ${p.number}`} · ${portTypeLabel[p.type]}`,
                  cfg?.description,
                  cfg?.vlan && `VLAN ${cfg.vlan}`,
                  cfg?.tagged?.length && `Tagged ${formatVids(cfg.tagged)}`,
                ].filter(Boolean).join('\n');
                return (
                  <div key={p.number} className="port" style={{ width: grid.portW, height: grid.portH }} title={title}>
                    <Handle
                      type="source"
                      position={Position.Top}
                      id={devicePortId(d.id, p.number, face)}
                      className={`port-handle port-${p.type}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {target && drag && (
        <div
          className={`drop-preview ${target.valid ? 'valid' : 'invalid'}`}
          style={place(rack.uHeight, target.uPosition, drag.uHeight)}
        >
          {target.valid
            ? `U${target.uPosition}${drag.uHeight > 1 ? `–U${topU({ uPosition: target.uPosition, uHeight: drag.uHeight })}` : ''}`
            : target.blockedBy ? `Clashes with ${target.blockedBy}` : 'Too tall for this rack'}
        </div>
      )}
    </div>
  );
}