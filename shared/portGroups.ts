// Ports on one face of a device are described as groups, e.g.
//   48 × RJ45 "Gi1/0/{n}"  +  4 × SFP "Te1/1/{n}"  +  1 × console "console"
// Ports are numbered 1, 2, 3… across the groups in order, which is what port ids
// and cables use, so renaming or retyping a group never breaks a cable.
import { z } from 'zod';

export const PortType = z.enum(['rj45', 'sfp', 'qsfp', 'lc', 'console', 'other']);
export type PortType = z.infer<typeof PortType>;

export const portTypeLabel: Record<PortType, string> = {
  rj45: 'RJ45',
  sfp: 'SFP/SFP+',
  qsfp: 'QSFP',
  lc: 'Fibre LC',
  console: 'Console',
  other: 'Other',
};

export const PortGroup = z.object({
  count: z.number().int().min(1).max(64),
  type: PortType,
  // "{n}" → 1, 2, 3…; "{n0}" → 0, 1, 2…; empty → "port 1", "port 2"…
  name: z.string().trim().max(40).optional(),
});
export type PortGroup = z.infer<typeof PortGroup>;

export const PortGroups = z.array(PortGroup).max(12);

export const totalPorts = (groups: PortGroup[] | undefined) =>
  (groups ?? []).reduce((sum, g) => sum + g.count, 0);

export type PortInfo = { number: number; name?: string; type: PortType };

/** One entry per port, in order. `name` is undefined when the group has no name pattern. */
export function expandPorts(groups: PortGroup[] | undefined): PortInfo[] {
  const out: PortInfo[] = [];
  for (const g of groups ?? []) {
    const pattern = g.name?.trim();
    for (let i = 1; i <= g.count; i++) {
      let name: string | undefined;
      if (pattern) {
        const hasPlaceholder = /\{n0?\}/.test(pattern);
        name = hasPlaceholder
          ? pattern.replace(/\{n0\}/g, String(i - 1)).replace(/\{n\}/g, String(i))
          : g.count > 1 ? `${pattern}${i}` : pattern; // "mgmt" ×1 → "mgmt"; "mgmt" ×2 → "mgmt1", "mgmt2"
      }
      out.push({ number: out.length + 1, name, type: g.type });
    }
  }
  return out;
}

/** "48×RJ45 + 4×SFP/SFP+" */
export const describeGroups = (groups: PortGroup[] | undefined) =>
  (groups ?? []).map((g) => `${g.count}×${portTypeLabel[g.type]}`).join(' + ');

type Family = 'copper' | 'sfp' | 'qsfp' | 'fibre' | 'any';
const family: Record<PortType, Family> = {
  rj45: 'copper', console: 'copper', sfp: 'sfp', qsfp: 'qsfp', lc: 'fibre', other: 'any',
};

/** A warning when two port types don't normally plug together, or null if they do. */
export function compatibilityWarning(a: PortType, b: PortType): string | null {
  const pair = [family[a], family[b]].sort().join('+');
  switch (pair) {
    case 'copper+sfp':
      return `${portTypeLabel[a]} to ${portTypeLabel[b]} needs a copper (RJ45) SFP module`;
    case 'copper+fibre':
    case 'copper+qsfp':
      return `${portTypeLabel[a]} and ${portTypeLabel[b]} don't connect directly (copper to ${pair.includes('fibre') ? 'fibre' : 'QSFP'})`;
    case 'qsfp+sfp':
      return 'QSFP to SFP needs a breakout cable or adapter';
    default:
      return null; // same family, fibre to an optic (SFP/QSFP + LC), or "other"
  }
}