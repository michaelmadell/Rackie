// Rack-unit maths shared by the server (validation) and the UI (drag preview).
import type { Mounting } from './schema';
import { totalPorts, type PortGroup } from './portGroups';

type Span = { uPosition: number; uHeight: number };
type Mounted = Span & { mounting?: Mounting };

export type Face = 'front' | 'rear';

/** Highest U a device occupies. */
export const topU = (d: Span) => d.uPosition + d.uHeight - 1;

/** True if two devices would occupy any of the same U. */
export const overlaps = (a: Span, b: Span) => a.uPosition <= topU(b) && b.uPosition <= topU(a);

/** The rack faces a device appears on. */
export const facesOf = (d: { mounting?: Mounting }): Face[] =>
  d.mounting === 'front' ? ['front'] : d.mounting === 'rear' ? ['rear'] : ['front', 'rear'];

/** Ports a device has on one face. */
export const portsOn = (d: { frontPorts?: PortGroup[]; rearPorts?: PortGroup[] }, face: Face) =>
  totalPorts(face === 'front' ? d.frontPorts : d.rearPorts);

/** Two devices clash if they share a U on the same face (half-depth front + rear devices can share). */
export const clashes = (a: Mounted, b: Mounted) =>
  overlaps(a, b) && facesOf(a).some((f) => facesOf(b).includes(f));