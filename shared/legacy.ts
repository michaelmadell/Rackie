// Converts data saved by older versions of the app to the current shape.
// Devices and presets used to store plain counts (portCount / rearPortCount);
// they now store port groups. Numbering is unchanged, so existing cables still fit.
import { BUILT_IN_PRESETS } from './presets';

type Raw = Record<string, unknown>;

export function upgradePorts<T>(item: T): T {
  if (!item || typeof item !== 'object') return item;
  const out = { ...(item as Raw) };
  for (const [count, groups] of [['portCount', 'frontPorts'], ['rearPortCount', 'rearPorts']] as const) {
    if (out[groups] === undefined && typeof out[count] === 'number') {
      out[groups] = (out[count] as number) > 0 ? [{ count: out[count], type: 'rj45' }] : [];
    }
    delete out[count];
  }
  return out as T;
}

/** As upgradePorts, and also fills in empty port lists for stored items that had none. */
function upgradeStored<T>(item: T): T {
  const out = upgradePorts(item) as Raw;
  if (!out || typeof out !== 'object') return item;
  for (const groups of ['frontPorts', 'rearPorts']) {
    if (out[groups] === undefined) out[groups] = [];
  }
  return out as T;
}

/** Applies every upgrade to a whole site as read from the database file. */
export function upgradeSite(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const site = { ...(raw as Raw) };
  if (Array.isArray(site.devices)) site.devices = site.devices.map(upgradeStored);
  if (Array.isArray(site.presets)) site.presets = site.presets.map(upgradeStored);
  if (site.powerLinks === undefined && Array.isArray(site.presets)) {
    const have = new Set(site.presets.map((p) => (p as Raw).id));
    site.presets = [...site.presets, ...BUILT_IN_PRESETS.filter((p) => p.kind === 'pdu' && !have.has(p.id))];
  }
  return site;
}