import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WallPortNodeType } from '../buildGraph';

export function WallPortNode({ data }: NodeProps<WallPortNodeType>) {
    const { wallPort } = data;

    return (
        <div className="wall-port" title={`Wall port ${wallPort.label}`}>
            <div className="port">
                <Handle type="source" position={Position.Top} id={wallPort.id} className="port-handle" />
            </div>
            <span>{wallPort.label}</span>
        </div>
    );
}