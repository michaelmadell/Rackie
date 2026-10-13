import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { api } from './app/api';
import { AppContext, collectionFor, useApp, type ColourBy, type Kind, type Selection, type View } from './app/AppContext';
import { buildEdges, buildNodes, type AppNode } from './canvas/buildGraph';
import { isRoomChild, positionInRoom, roomUnder } from './canvas/roomDrop';
import { useSite } from './app/useSite';
import type { DeviceDrag } from './canvas/useDeviceDrag';
import { Sidebar } from './sidebar/Sidebar';
import { RoomNode } from './canvas/nodes/RoomNode';
import { RackNode } from './canvas/nodes/RackNode';
import { WallPortNode } from './canvas/nodes/WallPortNode';
import { CableEdge } from './canvas/edges/CableEdge';
import { NetDeviceNode } from './canvas/nodes/NetDeviceNode';
import { buildNetworkEdges, buildNetworkNodes, type NetNodeType } from './canvas/networkGraph';
import { useTheme } from './app/theme';

// Defined outside the component so React Flow doesn't re-mount nodes on every render.
const nodeTypes: NodeTypes = { room: RoomNode, rack: RackNode, wallPort: WallPortNode, netDevice: NetDeviceNode };
const edgeTypes: EdgeTypes = { cable: CableEdge };

type CanvasNode = AppNode | NetNodeType; // rack views, or the network view

export default function App() {
  const { site, history, error, setError, run } = useSite();
  const [selected, setSelected] = useState<Selection>(null);
  const [drag, setDrag] = useState<DeviceDrag | null>(null);
  const [view, setView] = useState<View>('front');
  const [colourBy, setColourBy] = useState<ColourBy>('cable');
  const { theme, pref: themePref, setPref: setThemePref } = useTheme();

  if (!site) return <div className="loading">{error ?? 'Loading…'}</div>;

  return (
    <AppContext.Provider
      value={{ site, history, selected, select: setSelected, run, error, clearError: () => setError(null), drag, setDrag, view, setView, colourBy, setColourBy, theme, themePref, setThemePref }}
    >
      {/* The provider lets the sidebar (search) move the canvas view too. */}
      <ReactFlowProvider>
        <div className="layout">
          <Sidebar />
          <main className="canvas">
            <Canvas />
          </main>
        </div>
      </ReactFlowProvider>
      {drag?.label && drag.pointer && (
        // Follows the pointer while a preset is dragged in from the sidebar.
        <div className="drag-label" style={{ left: drag.pointer.x + 14, top: drag.pointer.y + 10 }}>
          {drag.label}
        </div>
      )}
    </AppContext.Provider>
  );
}

function Canvas() {
  const { site, selected, select, run, view, colourBy, theme } = useApp();
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([]);
  const network = view === 'network';
  const flow = useReactFlow();

  // Rebuild nodes whenever the saved data changes.
  useEffect(
    () => setNodes(network ? buildNetworkNodes(site) : buildNodes(site, view)),
    [site, view, network, setNodes],
  );

  // The network view is laid out separately, so fit it into view when switching to or from it.
  useEffect(() => {
    const t = setTimeout(() => flow.fitView({ padding: 0.1, duration: 300 }), 50);
    return () => clearTimeout(t);
  }, [network, flow]);

  const edges = useMemo<Edge[]>(
    () => (network ? buildNetworkEdges(site, selected, colourBy) : buildEdges(site, view, selected, colourBy)),
    [site, view, network, selected, colourBy],
  );

  // A port can only hold one cable, and a cable can't loop back to the same port.
  const isValidConnection = useCallback(
    (c: Connection | Edge) => {
      const a = c.sourceHandle;
      const b = c.targetHandle;
      if (!a || !b || a === b) return false;
      return !site.cables.some((cable) => [cable.a, cable.b].some((p) => p === a || p === b));
    },
    [site],
  );

  const onConnect = useCallback(
    async (c: Connection) => {
      if (!c.sourceHandle || !c.targetHandle) return;
      const cable = await run(() => api.create('cables', { a: c.sourceHandle, b: c.targetHandle }));
      if (cable) select({ kind: 'cable', id: cable.id });
    },
    [run, select],
  );

  // While a rack / wall port is dragged over a different room, highlight that room.
  const dropRoomId = useRef<string | null>(null);
  const highlightRoom = useCallback(
    (roomId: string | null) => {
      if (dropRoomId.current === roomId) return;
      dropRoomId.current = roomId;
      setNodes((ns) =>
        ns.map((n) => (n.type === 'room' ? { ...n, className: n.id === roomId ? 'drop-target' : undefined } : n)),
      );
    },
    [setNodes],
  );

  const onNodeDrag = useCallback(
    (_: unknown, node: CanvasNode) => {
      if (node.type === 'netDevice' || !isRoomChild(node)) return;
      const { room } = roomUnder(site, node);
      highlightRoom(room && room.id !== node.parentId ? room.id : null);
    },
    [site, highlightRoom],
  );

  // Save new positions when the user finishes dragging. Racks and wall ports
  // dropped over another room move into that room.
  const onNodeDragStop = useCallback(
    (_: unknown, _node: CanvasNode, all: CanvasNode[]) => {
      if (network) return; // network positions are worked out automatically, not saved
      const dragged = all as AppNode[];
      highlightRoom(null);
      run(async () => {
        let outside = false;
        await Promise.all(
          dragged.map((n) => {
            if (!isRoomChild(n)) {
              return api.update(collectionFor[n.type as Kind], n.id, {
                x: Math.round(n.position.x),
                y: Math.round(n.position.y),
              });
            }
            const { room, abs, width, height } = roomUnder(site, n);
            if (!room) {
              outside = true; // snaps back when the site reloads
              return;
            }
            return api.update(collectionFor[n.type as Kind], n.id, {
              roomId: room.id,
              ...positionInRoom(room, abs, width, height),
            });
          }),
        );
        if (outside) throw new Error('Racks and wall ports must be dropped inside a room.');
      });
    },
    [site, run, highlightRoom, network],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      onNodeClick={(_, n) => select(n.type === 'netDevice' ? (n as NetNodeType).data.target : { kind: n.type as Kind, id: n.id })}
      onEdgeClick={(_, e) => select({ kind: 'cable', id: (e.data as { cableId?: string } | undefined)?.cableId ?? e.id })}
      nodesConnectable={!network}
      onPaneClick={() => select(null)}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      connectionMode={ConnectionMode.Loose}
      deleteKeyCode={null} // deleting goes through the sidebar so it's saved
      className={theme}
      fitView
      minZoom={0.1}
      maxZoom={4} // zoom right in on dense switches
    >
      <Background gap={20} />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}