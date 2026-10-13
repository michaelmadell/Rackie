import { useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useApp, type Selection } from '../app/AppContext';
import { searchSite, type SearchResult } from './search';

const kindLabel: Record<SearchResult['kind'], string> = {
    room: 'Room', rack: 'Rack', device: 'Device', port: 'Port', wallPort: 'Wall port', cable: 'Cable', vlan: 'VLAN'
};

/** What to select for a result. A port selects its cable (so its path lights up), if it has one. */
function selectionFor(r: SearchResult): Selection {
    switch (r.kind) {
        case 'port':
            return r.cableId ? { kind: 'cable', id: r.cableId } : { kind: 'device', id: r.id.split(':')[0] };
        default:
            return { kind: r.kind, id: r.id };
    }
}

/** The on-screen element that represents a result, for zooming in close and flashing. */
function elementFor(r: SearchResult): HTMLElement | null {
    if (r.kind === 'device') return document.querySelector<HTMLElement>(`.device[data-device-id="${CSS.escape(r.id)}"]`);
    if (r.kind === 'port') return document.querySelector<HTMLElement>(`[data-handleid="${CSS.escape(r.id)}"]`)?.closest('.port') ?? null;
    return null;
}

function flash(elements: Element[]) {
    for (const el of elements) {
        el.classList.remove('search-flash');
        void (el as HTMLElement).offsetWidth; // restart the animation if it's already flashing
        el.classList.add('search-flash');
        setTimeout(() => el.classList.remove('search-flash'), 1600);
    }
}

export function SearchBox() {
    const { site, view, setView, select } = useApp();
    const flow = useReactFlow();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const input = useRef<HTMLInputElement>(null);

    const results = useMemo(() => searchSite(site, query), [site, query]);

    // "/" or Ctrl/Cmd+K jumps to the search box from anywhere (except while typing elsewhere).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, select');
            if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                input.current?.focus();
                input.current?.select();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    function go(r: SearchResult) {
        setOpen(false);
        input.current?.blur();

        if (view === 'network') {
            // Devices, ports and wall ports are on the network diagram: select and zoom there.
            const nodeId = r.kind === 'device' || r.kind === 'wallPort' ? r.id : r.kind === 'port' ? r.id.split(':')[0] : undefined;
            if (nodeId && flow.getNode(nodeId)) {
                select(r.kind === 'port' ? selectionFor(r) : { kind: r.kind as 'device' | 'wallPort', id: r.id });
                flow.fitView({ nodes: [{ id: nodeId }], duration: 500, maxZoom: 1.5 });
                const el = document.querySelector(`.react-flow__node[data-id="${CSS.escape(nodeId)}"]`);
                if (el) setTimeout(() => flash([el]), 500);
                return;
            }
            if (r.kind === 'cable' || r.kind === 'vlan') return select(selectionFor(r)); // highlighted in place
        }

        // Rear port in the Front view (or the other way round): switch to the face it's on.
        // From the network view, go back to the rack view the item is on.
        const target = view === 'network' ? (r.face ?? 'front') : r.face && view !== 'both' && view !== r.face ? r.face : undefined;
        const switchFace = !!target;
        if (target) setView(target);
        select(selectionFor(r));

        // Wait a moment for the canvas to redraw (it may have just changed view), then zoom.
        setTimeout(() => {
            const el = elementFor(r);
            if (el) {
                const box = el.getBoundingClientRect();
                const centre = flow.screenToFlowPosition({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
                flow.setCenter(centre.x, centre.y, { zoom: r.kind === 'port' ? 3 : 1.6, duration: 500 });
                setTimeout(() => flash([el]), 500);
            } else {
                flow.fitView({ nodes: r.nodeIds.map((id) => ({ id })), duration: 500, padding: 0.25, maxZoom: 1.5 });
                const nodes = r.nodeIds
                    .map((id) => document.querySelector(`.react-flow__node[data-id="${CSS.escape(id)}"]`))
                    .filter((n): n is Element => !!n);
                if (r.kind !== 'cable') setTimeout(() => flash(nodes), 500);
            }
        }, switchFace ? 150 : 30);
    }

    return (
        <div className="search" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
            <input
                ref={input}
                type="search"
                className="search-input"
                placeholder="Search…  ( / )"
                aria-label="Search devices, ports, racks, rooms, wall ports and cables"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                    setOpen(true);
                }}
                onFocus={() => query && setOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActive((a) => Math.min(a + 1, results.length - 1));
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActive((a) => Math.max(a - 1, 0));
                    } else if (e.key === 'Enter' && results[active]) {
                        go(results[active]);
                    } else if (e.key === 'Escape') {
                        setOpen(false);
                    }
                }}
            />
            {open && query.trim() && (
                <ul className="search-results" role="listbox">
                    {results.length === 0 && <li className="search-empty">No matches</li>}
                    {results.map((r, i) => (
                        <li key={`${r.kind}:${r.id}`} role="option" aria-selected={i === active}>
                            <button
                                className={`search-result${i === active ? ' active' : ''}`}
                                onMouseEnter={() => setActive(i)}
                                onMouseDown={(e) => e.preventDefault()} // keep focus so the list doesn't close first
                                onClick={() => go(r)}
                            >
                                <span className="search-kind">{kindLabel[r.kind]}</span>
                                <span className="search-text">
                                    <span className="search-title">{r.title}</span>
                                    <span className="search-sub">{r.matched ? `${r.matched} · ` : ''}{r.subtitle}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}