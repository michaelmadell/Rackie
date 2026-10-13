// Rack drawing sizes. RackNode draws with these and the cable router relies on
// them to know where each port sits inside its device.
export const U_PX = 22; // height of one rack unit
export const RACK_W = 360; // every rack is the same width, like a real 19" rack
export const PORT_GAP = 2;

// Must match the paddings in index.css (.rack, .u-label, .device).
const RACK_PAD = 6;
const U_LABEL_W = 22;
const DEVICE_RIGHT = 2;
const DEVICE_PAD_X = 6;
const NAME_MIN_W = 56; // always leave room for a few characters of the device name
const NAME_GAP = 6;
export const FACE_W = RACK_W - 2 * RACK_PAD; // one elevation (front or rear)
export const FACE_GAP = 10; // between front and rear when both are shown

/** Width available for a device's ports, beside its name. */
const PORT_AREA_W = RACK_W - 2 * RACK_PAD - U_LABEL_W - DEVICE_RIGHT - 2 * DEVICE_PAD_X - NAME_MIN_W - NAME_GAP;

const PORT_MAX_W = 11;
const PORT_MAX_H = 9;
const PORT_MIN = 4;

/** Drawn height of a device (1px gap above and below it). */
export const deviceHeight = (uHeight: number) => uHeight * U_PX - 2;

export const rackWidth = (faces: number) => 2 * RACK_PAD + faces * FACE_W + (faces - 1) * FACE_GAP;

export type PortGrid = { rows: number; columns: number; portW: number; portH: number };

/**
 * Picks the port layout with the biggest ports that fit the device's face.
 * Uses one row or an even number of rows (ports stacked in pairs, like real switches).
 * e.g. 8 ports 1U → 1×8; 24 ports 1U → 2×12; 48 ports 1U → 2×24; 48 ports 2U → 4×12.
 */
export function portGrid(uHeight: number, portCount: number): PortGrid {
  if (portCount <= 0) return { rows: 0, columns: 0, portW: 0, portH: 0 };
  const innerH = deviceHeight(uHeight) - 2; // 1px breathing room top and bottom

  let best: PortGrid = { rows: 1, columns: portCount, portW: PORT_MIN, portH: PORT_MIN };
  let bestArea = -1;
  for (let rows = 1; rows <= portCount; rows++) {
    const columns = Math.ceil(portCount / rows);
    const portW = Math.min(PORT_MAX_W, Math.floor((PORT_AREA_W + PORT_GAP) / columns) - PORT_GAP);
    const portH = Math.min(PORT_MAX_H, Math.floor((innerH + PORT_GAP) / rows) - PORT_GAP);
    if (portH < PORT_MIN) break; // more rows only get shorter
    if (rows > 1 && rows % 2 === 1) continue; // like real kit: one row, or stacked pairs of rows
    if (portW < PORT_MIN) continue; // too many columns, try more rows
    if (portW * portH > bestArea) {
      best = { rows, columns, portW, portH };
      bestArea = portW * portH;
    }
  }
  return best;
}

/**
 * Vertical distance from a port's top edge (where its handle anchors) to the gap
 * just outside the nearest top or bottom edge of its device.
 * Negative = up to the top edge, positive = down to the bottom edge.
 */
export function portStubDy(uHeight: number, portCount: number, port: number): number {
  const h = deviceHeight(uHeight);
  const { rows, columns, portH } = portGrid(uHeight, portCount);
  const block = rows * portH + (rows - 1) * PORT_GAP; // ports are centred vertically
  const row = Math.floor((port - 1) / columns);
  const portTop = (h - block) / 2 + row * (portH + PORT_GAP); // from device top
  const toTop = portTop + portH / 2;
  const toBottom = h - toTop;
  return toTop <= toBottom ? -(portTop + 1) : h - portTop + 1;
}