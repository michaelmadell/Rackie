import type { Site } from '#shared/schema';
import type { View } from '../app/AppContext';
import { rackWidth, U_PX } from './layout';

const RACK_GAP = 40;
const ROOM_PAD = 30;
const WALL_PORT_W = 80;
const rackHeight = (uHeight: number) => uHeight * U_PX + 50; // body + header, roughly

const overlapY = (a: { y: number; h: number }, b: { y: number; h: number }) => a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Showing both faces makes every rack twice as wide, so neighbours would overlap.
 * For that view only, push racks apart (keeping their order), move wall ports along
 * with them, widen rooms to fit and shift rooms further right by the same amount.
 * Display only: nothing is saved, and the layout isn't draggable in this view.
 */
export function layoutForView(site: Site, view: View): Site {
  if (view !== 'both') return site;

  const width = rackWidth(2);
  const racks = site.racks.map((r) => ({ ...r }));
  const wallPorts = site.wallPorts.map((w) => ({ ...w }));
  const growth = new Map<string, number>();

  for (const room of site.rooms) {
    const inRoom = racks.filter((r) => r.roomId === room.id).sort((a, b) => a.x - b.x);
    const shifts: { from: number; by: number }[] = [];

    inRoom.forEach((rack, i) => {
      const from = rack.x;
      for (const left of inRoom.slice(0, i)) {
        const sameRow = overlapY(
          { y: rack.y, h: rackHeight(rack.uHeight) },
          { y: left.y, h: rackHeight(left.uHeight) },
        );
        if (sameRow) rack.x = Math.max(rack.x, left.x + width + RACK_GAP);
      }
      shifts.push({ from, by: rack.x - from });
    });

    // Wall ports move with the furthest-moved rack that started to their left.
    const ports = wallPorts.filter((w) => w.roomId === room.id);
    for (const w of ports) {
      w.x += Math.max(0, ...shifts.filter((s) => s.from <= w.x).map((s) => s.by));
    }

    const right = Math.max(0, ...inRoom.map((r) => r.x + width), ...ports.map((w) => w.x + WALL_PORT_W));
    growth.set(room.id, Math.max(0, right + ROOM_PAD - room.width));
  }

  const rooms = site.rooms.map((room) => {
    // Rooms wholly to the left in the same row push this one along by however much they grew.
    const shift = site.rooms
      .filter((o) => o.x + o.width <= room.x && overlapY({ y: o.y, h: o.height }, { y: room.y, h: room.height }))
      .reduce((sum, o) => sum + (growth.get(o.id) ?? 0), 0);
    return { ...room, x: room.x + shift, width: room.width + (growth.get(room.id) ?? 0) };
  });

  return { ...site, rooms, racks, wallPorts };
}