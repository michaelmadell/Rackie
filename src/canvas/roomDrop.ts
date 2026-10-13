import type { Room, Site } from '#shared/schema';
import type { AppNode } from './buildGraph';

/** Racks and wall ports live inside a room and can be dragged between rooms. */
export const isRoomChild = (n: AppNode) => n.type === 'rack' || n.type === 'wallPort';

/**
 * Finds the room under the centre of a dragged rack / wall port.
 * React Flow gives child positions relative to their current room, so we
 * convert to canvas coordinates first (rooms are top-level, so that's just an add).
 */
export function roomUnder(site: Site, n: AppNode) {
  const parent = site.rooms.find((r) => r.id === n.parentId);
  const abs = { x: (parent?.x ?? 0) + n.position.x, y: (parent?.y ?? 0) + n.position.y };
  const width = n.measured?.width ?? 0;
  const height = n.measured?.height ?? 0;
  const cx = abs.x + width / 2;
  const cy = abs.y + height / 2;

  // If rooms overlap, prefer the smallest one (the most specific).
  const room = site.rooms
    .filter((r) => cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height)
    .sort((a, b) => a.width * a.height - b.width * b.height)[0];

  return { room, abs, width, height };
}

/** Position relative to `room`, nudged so the node sits fully inside it. */
export function positionInRoom(room: Room, abs: { x: number; y: number }, width: number, height: number) {
  const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(v, 0), Math.max(0, max)));
  return {
    x: clamp(abs.x - room.x, room.width - width),
    y: clamp(abs.y - room.y, room.height - height),
  };
}