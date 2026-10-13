import { NodeResizer, type NodeProps } from '@xyflow/react';
import type { RoomNodeType } from '../buildGraph';
import { api } from '../../app/api';
import { useApp } from '../../app/AppContext';

export function RoomNode({ data, selected }: NodeProps<RoomNodeType>) {
  const { run, view } = useApp();
  const { room } = data;

  return (
    <div className="room">
      <NodeResizer
        isVisible={selected && view !== 'both'}
        minWidth={200}
        minHeight={200}
        onResizeEnd={(_, p) =>
          run(() =>
            api.update('rooms', room.id, {
              x: Math.round(p.x), y: Math.round(p.y),
              width: Math.round(p.width), height: Math.round(p.height),
            }),
          )
        }
      />
      <div className="room-label">{room.name}</div>
    </div>
  );
}