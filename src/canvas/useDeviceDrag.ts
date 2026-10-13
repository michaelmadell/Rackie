import { useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import type { Device, Mounting, Preset, Rack, Site } from '#shared/schema';
import { clashes, facesOf, type Face } from '#shared/units';
import { api } from '../app/api';
import { useApp } from '../app/AppContext';

export type DropTarget = { rackId: string; uPosition: number; valid: boolean; blockedBy?: string };
export type DeviceDrag = {
  deviceId: string; // the device being moved, or "preset:<id>" when adding from a preset
  uHeight: number;
  faces: Face[];
  target: DropTarget | null;
  label?: string; // shown next to the pointer (presets, which start outside the racks)
  pointer?: { x: number; y: number };
};

/** What's being dragged: an existing device, or a preset about to become one. */
type DragItem = { id: string; uHeight: number; mounting?: Mounting };

const DRAG_THRESHOLD_PX = 4; // smaller movements count as a click

/** Works out which rack and U the pointer is over. */
function dropTargetAt(site: Site, item: DragItem, grabRow: number, x: number, y: number): DropTarget | null {
  // Find the rack body under the pointer (devices, cables etc. may be on top of it).
  const body = document.elementsFromPoint(x, y).find((el) => el.classList.contains('rack-body')) as
    | HTMLElement
    | undefined;
  const rack = site.racks.find((r) => r.id === body?.dataset.rackId);
  if (!body || !rack) return null;

  // Measure on screen so this works at any zoom level.
  const rect = body.getBoundingClientRect();
  const uOnScreen = rect.height / rack.uHeight;
  const rowFromTop = Math.floor((y - rect.top) / uOnScreen) - grabRow;
  const maxU = rack.uHeight - item.uHeight + 1;
  if (maxU < 1) return { rackId: rack.id, uPosition: 1, valid: false }; // taller than the rack

  const top = rack.uHeight - rowFromTop;
  const uPosition = Math.min(Math.max(top - item.uHeight + 1, 1), maxU);
  // Same rule as the server: a clash is a shared U on a shared face.
  const blocker = site.devices.find(
    (o) => o.id !== item.id && o.rackId === rack.id && clashes(o, { ...item, uPosition }),
  );
  return { rackId: rack.id, uPosition, valid: !blocker, blockedBy: blocker?.name };
}

/**
 * Follows the pointer until it's released (or Esc is pressed), keeping the drop
 * preview up to date, then calls `onDrop` if it was released over a free spot.
 */
function beginDrag(
  e: ReactPointerEvent<HTMLElement>,
  item: DragItem,
  grabRow: number,
  site: Site,
  setDrag: (d: DeviceDrag | null) => void,
  onDrop: (target: DropTarget) => void,
  label?: string,
) {
  const startX = e.clientX;
  const startY = e.clientY;
  let started = false;
  let target: DropTarget | null = null;

  const onMove = (ev: PointerEvent) => {
    if (!started && Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) return;
    if (!started) document.body.classList.add('dragging-device');
    started = true;
    target = dropTargetAt(site, item, grabRow, ev.clientX, ev.clientY);
    setDrag({
      deviceId: item.id,
      uHeight: item.uHeight,
      faces: facesOf(item),
      target,
      label,
      pointer: { x: ev.clientX, y: ev.clientY },
    });
  };

  const finish = (commit: boolean) => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('keydown', onKey);
    document.body.classList.remove('dragging-device');
    setDrag(null);
    if (commit && started && target?.valid) onDrop(target);
  };
  const onUp = () => finish(true);
  const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && finish(false);

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('keydown', onKey);
}

/** Returns a pointerdown handler that lets a device be dragged within or between racks. */
export function useDeviceDrag() {
  const { site, setDrag, run } = useApp();

  return useCallback(
    (e: ReactPointerEvent<HTMLElement>, device: Device, rack: Rack) => {
      // Left button only, and leave port handles alone so cabling still works.
      if (e.button !== 0 || (e.target as Element).closest('.react-flow__handle')) return;

      // Remember which U of the device was grabbed, so it doesn't jump under the pointer.
      const body = e.currentTarget.closest('.rack-body')!.getBoundingClientRect();
      const uOnScreen = body.height / rack.uHeight;
      const grabRow = Math.floor((e.clientY - e.currentTarget.getBoundingClientRect().top) / uOnScreen);

      beginDrag(e, device, grabRow, site, setDrag, ({ rackId, uPosition }) => {
        if (rackId === device.rackId && uPosition === device.uPosition) return; // didn't move
        run(() => api.update('devices', device.id, { rackId, uPosition }));
      });
    },
    [site, setDrag, run],
  );
}

export const presetDevice = (p: Preset) => ({
  name: p.name,
  kind: p.kind,
  uHeight: p.uHeight,
  mounting: p.mounting ?? 'both',
  frontPorts: p.frontPorts,
  rearPorts: p.rearPorts,
  ...(p.manufacturer ? { manufacturer: p.manufacturer } : {}),
  ...(p.model ? { model: p.model } : {}),
  ...(p.psus ? { psus: p.psus } : {}),
  ...(p.powerDraw ? { powerDraw: p.powerDraw } : {}),
  ...(p.outlets ? { outlets: p.outlets } : {}),
  ...(p.capacity ? { capacity: p.capacity } : {}),
});

/** Returns a pointerdown handler for dragging a preset from the sidebar onto a rack. */
export function usePresetDrag() {
  const { site, setDrag, run, select } = useApp();

  return useCallback(
    (e: ReactPointerEvent<HTMLElement>, preset: Preset) => {
      if (e.button !== 0) return;
      const item = { id: `preset:${preset.id}`, uHeight: preset.uHeight, mounting: preset.mounting };
      // grabRow 0: the pointer holds the top U of the new device.
      beginDrag(e, item, 0, site, setDrag, async ({ rackId, uPosition }) => {
        const created = await run(() => api.create('devices', { ...presetDevice(preset), rackId, uPosition }));
        if (created) select({ kind: 'device', id: created.id });
      }, preset.name);
    },
    [site, setDrag, run, select],
  );
}