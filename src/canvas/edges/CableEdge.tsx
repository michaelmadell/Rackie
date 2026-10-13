import { BaseEdge, getBezierPath, useInternalNode, type EdgeProps, type InternalNode } from '@xyflow/react';
import type { CableEdgeType, EndInfo } from '../buildGraph';
import { midpoint, sameRackRoute, toSvgPath, trayRoute, trayY, type Box, type CableEnd, type Pt } from '../routing';

/** On-screen bounds of a node, from React Flow's live (absolute) position. */
function boxOf(node: InternalNode | undefined): Box | null {
  if (!node) return null;
  const { x, y } = node.internals.positionAbsolute;
  return { left: x, top: y, right: x + (node.measured.width ?? 0), bottom: y + (node.measured.height ?? 0) };
}

/** `node` is the rack (device ports) or the wall port itself; `room` is the room it's in. */
function toEnd(info: EndInfo, at: Pt, node: Box, room: Box, trayLane: number): CableEnd {
  return info.kind === 'wall'
    ? { kind: 'wall', at, room, lane: trayLane }
    : { kind: 'device', at, rack: node, stubDy: info.stubDy, lane: info.lane };
}

export function CableEdge(props: EdgeProps<CableEdgeType>) {
  const { id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;

  // Hooks must always run, so look everything up before deciding how to draw.
  const sourceBox = boxOf(useInternalNode(source));
  const targetBox = boxOf(useInternalNode(target));
  const roomA = boxOf(useInternalNode(data?.roomA ?? ''));
  const roomB = boxOf(useInternalNode(data?.roomB ?? ''));

  let path: string;
  let labelAt: Pt;

  if (!data || data.routing === 'direct' || !sourceBox || !targetBox || !roomA || !roomB) {
    const [bezier, x, y] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    path = bezier;
    labelAt = { x, y };
  } else {
    const a = toEnd(data.a, { x: sourceX, y: sourceY }, sourceBox, roomA, data.trayLaneA);
    const b = toEnd(data.b, { x: targetX, y: targetY }, targetBox, roomB, data.trayLaneB);
    const points =
      source === target && a.kind === 'device' && b.kind === 'device'
        ? sameRackRoute(a, b)
        : trayRoute(
            a,
            b,
            trayY(roomA, data.trayLaneA),
            trayY(roomB, data.trayLaneB),
            data.roomA === data.roomB ? undefined : { roomA, roomB, lane: data.trayLaneA },
          );
    path = toSvgPath(points);
    labelAt = midpoint(points);
  }

  return (
    <BaseEdge
      id={id}
      path={path}
      label={props.label}
      labelX={labelAt.x}
      labelY={labelAt.y}
      style={props.style}
      interactionWidth={props.interactionWidth}
    />
  );
}