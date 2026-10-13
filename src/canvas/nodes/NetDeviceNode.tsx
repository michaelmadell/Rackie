import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NetNodeType } from '../networkGraph';

const kindLabel = { server: 'Server', switch: 'Switch', 'patch-panel': 'Patch panel', pdu: 'PDU', other: 'Device', wall: 'Wall port' };

/** A device (or wall port) in the network view. Lines join top and bottom. */
export function NetDeviceNode({ data, selected }: NodeProps<NetNodeType>) {
  return (
    <div className={`net-node net-${data.kind}${selected ? ' selected' : ''}`} style={{ borderLeftColor: data.roomColour }}>
      <Handle type="target" position={Position.Top} isConnectable={false} className="net-handle" />
      <div className="net-title">
        <span className="net-name">{data.title}</span>
        <span className="net-kind">{kindLabel[data.kind]}</span>
      </div>
      <div className="net-sub">{data.subtitle}</div>
      <div className="net-sub">{data.ip ?? ''}{data.ip ? ' · ' : ''}{data.links} link{data.links === 1 ? '' : 's'}</div>
      <Handle type="source" position={Position.Bottom} isConnectable={false} className="net-handle" />
    </div>
  );
}