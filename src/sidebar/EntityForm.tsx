import { useState } from 'react';
import type { PortGroup } from '#shared/portGroups';
import { PortGroupsEditor } from './PortGroupsEditor';

export type Field =
  | { type: 'heading'; key: string; label: string }
  | {
      key: string;
      label: string;
      type: 'text' | 'number' | 'color' | 'select' | 'textarea' | 'portGroups';
      options?: { value: string; label: string }[];
      placeholder?: string;
    };

type Props = {
  entity: Record<string, unknown>;
  fields: Field[];
  onSave: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
};

/** How a field's saved value is held while editing. */
function initialValue(f: Field, entity: Record<string, unknown>): unknown {
  if (f.type === 'portGroups') return (entity[f.key] as PortGroup[] | undefined) ?? [];
  return String(entity[f.key] ?? '');
}

/** How an edited value is sent to the server. */
function outputValue(f: Field, value: unknown): unknown {
  if (f.type === 'number') return Number(value);
  if (f.type === 'portGroups') {
    return (value as PortGroup[]).map((g) => ({
      count: Number(g.count),
      type: g.type,
      ...(g.name?.trim() ? { name: g.name.trim() } : {}),
    }));
  }
  return value; // blank text means "clear it"; the server handles that
}

/** A generic edit form: renders the given fields and saves only what changed. */
export function EntityForm({ entity, fields, onSave, onDelete }: Props) {
  const editable = fields.filter((f) => f.type !== 'heading');
  const [draft, setDraft] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(editable.map((f) => [f.key, initialValue(f, entity)])),
  );
  const set = (key: string, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));

  const patch = Object.fromEntries(
    editable
      .filter((f) => JSON.stringify(outputValue(f, draft[f.key])) !== JSON.stringify(outputValue(f, initialValue(f, entity))))
      .map((f) => [f.key, outputValue(f, draft[f.key])]),
  );
  const dirty = Object.keys(patch).length > 0;

  return (
    <form
      className="entity-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) onSave(patch);
      }}
    >
      {fields.map((f) => {
        if (f.type === 'heading') return <h3 key={f.key} className="form-heading">{f.label}</h3>;
        const value = draft[f.key];
        if (f.type === 'portGroups') {
          return (
            <div key={f.key} className="field">
              <span>{f.label}</span>
              <PortGroupsEditor value={value as PortGroup[]} onChange={(v: any) => set(f.key, v)} />
            </div>
          );
        }
        return (
          <label key={f.key} className="field">
            <span>{f.label}</span>
            {f.type === 'select' ? (
              <select value={value as string} onChange={(e) => set(f.key, e.target.value)}>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea rows={3} value={value as string} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <input type={f.type} value={value as string} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
            )}
          </label>
        );
      })}
      <div className="form-actions">
        <button type="submit" disabled={!dirty}>Save</button>
        <button type="button" className="danger" onClick={onDelete}>Delete</button>
      </div>
    </form>
  );
}