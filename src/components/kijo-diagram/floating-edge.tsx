"use client";

import { useCallback } from "react";
import {
  useInternalNode,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import { getEdgeParams } from "./floating-edge-utils";

export function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
}: EdgeProps<Edge>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode
  );

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
      style={style}
    />
  );
}
