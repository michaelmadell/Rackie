import type { Site } from './schema';
import type { Face } from './units';
import { expandPorts, type PortType } from './portGroups';

/** Front ports are "<deviceId>:3" (unchanged from before rear ports existed); rear ports are "<deviceId>:r3". */
export const devicePortId = (deviceId: string, port: number, face: Face = 'front') =>
  face === 'rear' ? `${deviceId}:r${port}` : `${deviceId}:${port}`;

export type PortRef = {
  id: string;
  kind: 'device' | 'wall';
  nodeId: string; // the React Flow node the port's handle lives on (rack or wall port)
  roomId: string;
  label: string; // e.g. "Server Room A › A1 › Core Switch › port 3"
  deviceId?: string; // device ports only
  port?: number; // device ports only, 1-based
  face?: Face; // device ports only
  name: string; // "Gi1/0/12", or "port 12" / "rear port 3" when the group has no name pattern
  portType?: PortType; // device ports only
};

export function indexPorts(site: Site): Map<string, PortRef> {
    const ports = new Map<string, PortRef>();
    const rooms = new Map(site.rooms.map((r) => [r.id, r]));
    const racks = new Map(site.racks.map((r) => [r.id, r]));

    for (const d of site.devices) {
        const rack = racks.get(d.rackId);
        if (!rack) continue;
        const roomName = rooms.get(rack.roomId)?.name ?? '?';
        for (const face of ['front', 'rear'] as const) {
            for (const p of expandPorts(face === 'front' ? d.frontPorts : d.rearPorts)) {
                const id = devicePortId(d.id, p.number, face);
                const name = p.name ?? `${face === 'rear' ? 'rear ' : ''}port ${p.number}`;
                ports.set(id, {
                    id,
                    kind: 'device',
                    deviceId: d.id,
                    port: p.number,
                    face,
                    name,
                    portType: p.type,
                    nodeId: rack.id,
                    roomId: rack.roomId,
                    label: `${roomName} › ${rack.name} › ${d.name} › ${name}`,
                });
            }
        }
    }

    for (const w of site.wallPorts) {
            ports.set(w.id, {
            id: w.id,
            kind: 'wall',
            name: `wall port ${w.label}`,
            nodeId: w.id,
            roomId: w.roomId,
            label: `${rooms.get(w.roomId)?.name ?? '?'} › wall port ${w.label}`,
        });
    }
    return ports;
}