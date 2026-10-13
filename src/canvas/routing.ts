// Orthogonal "bundled" cable routing. Pure geometry, no React.
//
//   port ─► nearest device edge ─► side of rack ─► riser up the side
//        ─► across the rack top to the exit point ─► overhead tray above the room
//        ─► along the tray ─► (jog between rooms) ─► down into the other end
//
// Wall-port cables split off the tray, run down the room's nearest side wall and
// along to the port, rather than dropping straight through the racks.
//
// Each cable gets its own lane (LANE px apart) on risers and trays, so a bundle
// draws as a ribbon of parallel coloured lines rather than one overlapping line.

export type Pt = { x: number; y: number };
export type Box = { left: number; top: number; right: number; bottom: number };

export const LANE = 3; // gap between parallel cables in a bundle
const RISER_GAP = 6; // riser distance outside the rack's side
const TOP_GAP = 8; // first lane above the rack's top
const EXIT_GAP = 2; // half-width of the gap at the centre of the rack exit
const TRAY_GAP = 14; // tray distance above the room's top wall
const WALL_GAP = 8; // wall-port runs: distance inside the room's side wall
const PORT_RUN_GAP = 10; // wall-port runs: height of the run above the port
const CORNER = 4; // corner rounding radius

export type DeviceEnd = { kind: 'device'; at: Pt; stubDy: number; lane: number; rack: Box };
export type WallEnd = { kind: 'wall'; at: Pt; room: Box; lane: number };
export type CableEnd = DeviceEnd | WallEnd;

const centreX = (b: Box) => (b.left + b.right) / 2;

export const trayY = (room: Box, lane: number) => room.top - TRAY_GAP - lane * LANE;

/** Which side of the rack the port is nearer to, and the x of its riser lane. */
function riser(e: DeviceEnd) {
  const side = e.at.x >= centreX(e.rack) ? 1 : -1;
  const edge = side > 0 ? e.rack.right : e.rack.left;
  return { side, x: edge + side * (RISER_GAP + e.lane * LANE) };
}

/** From an end up to the tray at height `tray`. */
function legToTray(e: CableEnd, tray: number): Pt[] {
  if (e.kind === 'wall') {
    const inset = WALL_GAP + e.lane * LANE;
    const nearLeft = e.at.x - e.room.left <= e.room.right - e.at.x;
    const wallX = nearLeft ? e.room.left + inset : e.room.right - inset;
    const runY = e.at.y - PORT_RUN_GAP - e.lane * LANE;
    return [e.at, { x: e.at.x, y: runY }, { x: wallX, y: runY }, { x: wallX, y: tray }];
  }

  const { side, x } = riser(e);
  const edgeY = e.at.y + e.stubDy; // gap beside the device
  const topY = e.rack.top - TOP_GAP - e.lane * LANE; // outer lanes cross the top higher up…
  const exitX = centreX(e.rack) + side * (EXIT_GAP + e.lane * LANE); // …and exit further out, so they never cross
  return [
    e.at,
    { x: e.at.x, y: edgeY },
    { x, y: edgeY },
    { x, y: topY },
    { x: exitX, y: topY },
    { x: exitX, y: tray },
  ];
}

/** Both ends in the same rack: stay on the rack's side, no tray. */
export function sameRackRoute(a: DeviceEnd, b: DeviceEnd): Pt[] {
  const { x } = riser(a);
  const ya = a.at.y + a.stubDy;
  const yb = b.at.y + b.stubDy;
  return [a.at, { x: a.at.x, y: ya }, { x, y: ya }, { x, y: yb }, { x: b.at.x, y: yb }, b.at];
}

/**
 * Via the overhead trays. For cables between rooms, pass both room boxes: the
 * cable jogs between the trays in the gap between the rooms.
 */
export function trayRoute(
  a: CableEnd,
  b: CableEnd,
  trayA: number,
  trayB: number,
  between?: { roomA: Box; roomB: Box; lane: number },
): Pt[] {
  const legA = legToTray(a, trayA);
  const legB = legToTray(b, trayB).reverse();
  if (!between) return [...legA, ...legB];

  const { roomA, roomB, lane } = between;
  const xa = legA[legA.length - 1].x;
  const xb = legB[0].x;
  const jumpX =
    roomA.right < roomB.left ? (roomA.right + roomB.left) / 2
    : roomB.right < roomA.left ? (roomB.right + roomA.left) / 2
    : (xa + xb) / 2;
  const x = jumpX + lane * LANE;
  return [...legA, { x, y: trayA }, { x, y: trayB }, ...legB];
}

/** Drops repeated points and points in the middle of a straight run. */
function simplify(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    const prev = out[out.length - 2];
    if (prev && last && ((prev.x === last.x && last.x === p.x) || (prev.y === last.y && last.y === p.y))) {
      out[out.length - 1] = p; // extend the straight run
    } else {
      out.push(p);
    }
  }
  return out;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const towards = (from: Pt, to: Pt, d: number): Pt => {
  const len = dist(from, to) || 1;
  return { x: from.x + ((to.x - from.x) * d) / len, y: from.y + ((to.y - from.y) * d) / len };
};

/** SVG path through the points, with slightly rounded corners. */
export function toSvgPath(points: Pt[]): string {
  const pts = simplify(points);
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [prev, corner, next] = [pts[i - 1], pts[i], pts[i + 1]];
    const r = Math.min(CORNER, dist(prev, corner) / 2, dist(corner, next) / 2);
    const a = towards(corner, prev, r);
    const b = towards(corner, next, r);
    d += ` L ${a.x} ${a.y} Q ${corner.x} ${corner.y} ${b.x} ${b.y}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${last.x} ${last.y}`;
}

/** Point halfway along the route (for the cable's label). */
export function midpoint(points: Pt[]): Pt {
  const total = points.slice(1).reduce((sum, p, i) => sum + dist(points[i], p), 0);
  let remaining = total / 2;
  for (let i = 1; i < points.length; i++) {
    const seg = dist(points[i - 1], points[i]);
    if (seg >= remaining) return towards(points[i - 1], points[i], remaining);
    remaining -= seg;
  }
  return points[points.length - 1] ?? { x: 0, y: 0 };
}