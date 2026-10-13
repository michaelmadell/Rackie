import { useRef } from 'react';
import type { Preset, Rack } from '#shared/schema';
import { api } from '../app/api';
import { useApp } from '../app/AppContext';
import { presetDevice, usePresetDrag } from '../canvas/useDeviceDrag';
import { describeGroups } from '#shared/portGroups';

const describe = (p: Preset) => {
  const front = describeGroups(p.frontPorts);
  const rear = describeGroups(p.rearPorts);
  const ports = [front && `front ${front}`, rear && `rear ${rear}`].filter(Boolean).join(' · ') || 'no ports';
  const mount = p.mounting === 'front' ? ' · front only' : p.mounting === 'rear' ? ' · rear only' : '';
  return `${p.uHeight}U · ${ports}${mount}`;
};

/** The preset library: drag a preset onto a rack, or click it to add it to the selected rack. */
export function PresetPalette({ rack }: { rack?: Rack }) {
  const { site, run, select } = useApp();
  const startDrag = usePresetDrag();
  const pressedAt = useRef({ x: 0, y: 0 });

  async function addToRack(p: Preset) {
    if (!rack) return;
    // No position given: the server puts it in the lowest free U.
    const created = await run(() => api.create('devices', { ...presetDevice(p), rackId: rack.id }));
    if (created) select({ kind: 'device', id: created.id });
  }

  return (
    <details className="presets" open>
      <summary>Device presets</summary>
      <p className="presets-hint">
        Drag onto a rack{rack ? `, or click to add to rack ${rack.name}` : ', or select a rack and click'}.
      </p>
      <ul>
        {site.presets.map((p) => (
          <li key={p.id}>
            <button
              className="preset"
              title={rack ? `Click to add to rack ${rack.name}, or drag onto any rack` : 'Drag onto a rack'}
              onPointerDown={(e) => {
                pressedAt.current = { x: e.clientX, y: e.clientY };
                startDrag(e, p);
              }}
              onClick={(e) => {
                // A drag that ends back over the button still fires a click; ignore it.
                const moved = Math.hypot(e.clientX - pressedAt.current.x, e.clientY - pressedAt.current.y) > 4;
                if (!moved) addToRack(p);
              }}
            >
              <span className={`preset-chip device-${p.kind}`} style={{ height: 6 + Math.min(p.uHeight, 4) * 4 }} />
              <span className="preset-text">
                <span className="preset-name">{p.name}{p.model && p.model !== p.name ? ` · ${p.model}` : ''}</span>
                <span className="preset-meta" title={describe(p)}>{describe(p)}</span>
              </span>
            </button>
            <button className="icon" aria-label={`Edit preset ${p.name}`} title="Edit preset" onClick={() => select({ kind: 'preset', id: p.id })}>
              ✎
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}