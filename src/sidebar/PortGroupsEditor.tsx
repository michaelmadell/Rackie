import { expandPorts, PortType, portTypeLabel, type PortGroup } from '#shared/portGroups';

type Props = { value: PortGroup[]; onChange: (groups: PortGroup[]) => void };

/** Rows of "count × type, name pattern", plus a preview of the names they produce. */
export function PortGroupsEditor({ value, onChange }: Props) {
  const update = (i: number, change: Partial<PortGroup>) =>
    onChange(value.map((g, j) => (j === i ? { ...g, ...change } : g)));

  const ports = expandPorts(value.map((g) => ({ ...g, count: Math.max(0, Number(g.count) || 0) })));
  const total = ports.length;
  const preview = (n: number) => ports[n - 1]?.name ?? `port ${n}`;

  return (
    <div className="port-groups">
      {value.map((g, i) => (
        <div key={i} className="port-group">
          <input
            type="number"
            min={1}
            max={64}
            aria-label="Number of ports"
            className="pg-count"
            value={g.count}
            onChange={(e) => update(i, { count: e.target.value as unknown as number })}
          />
          <span className="pg-times">×</span>
          <select aria-label="Port type" value={g.type} onChange={(e) => update(i, { type: e.target.value as PortType })}>
            {PortType.options.map((t) => (
              <option key={t} value={t}>{portTypeLabel[t]}</option>
            ))}
          </select>
          <input
            aria-label="Name pattern"
            className="pg-name"
            placeholder="port {n}"
            value={g.name ?? ''}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <button type="button" className="icon" aria-label="Remove group" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <div className="pg-footer">
        <button type="button" className="link" onClick={() => onChange([...value, { count: 1, type: 'rj45' }])}>
          + Add ports
        </button>
        {total > 0 && (
          <span className="pg-preview" title="Port names this produces">
            {total} port{total > 1 ? 's' : ''}: {preview(1)}
            {total > 1 && ` … ${preview(total)}`}
          </span>
        )}
      </div>
    </div>
  );
}