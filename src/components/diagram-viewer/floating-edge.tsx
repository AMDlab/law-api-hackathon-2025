"use client";

import {
  getBezierPath,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import { getEdgeParams } from "./floating-edge-utils";

export function FloatingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  source,
  target,
  selected,
  markerEnd,
  style,
  label,
  labelStyle,
  labelBgStyle,
}: EdgeProps<Edge>) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const useFlowPositions = selected || !sourceNode || !targetNode;
  const edgeCoords = useFlowPositions
    ? {
        sx: sourceX,
        sy: sourceY,
        tx: targetX,
        ty: targetY,
        sourcePos: sourcePosition,
        targetPos: targetPosition,
      }
    : getEdgeParams(sourceNode, targetNode);

  const [edgePath] = getBezierPath({
    sourceX: edgeCoords.sx,
    sourceY: edgeCoords.sy,
    sourcePosition: edgeCoords.sourcePos,
    targetPosition: edgeCoords.targetPos,
    targetX: edgeCoords.tx,
    targetY: edgeCoords.ty,
  });

  // ラベル位置を分岐ノードの直後（sourceから20%の位置）に配置
  const labelOffset = 0.2;
  const nearSourceX =
    edgeCoords.sx + (edgeCoords.tx - edgeCoords.sx) * labelOffset;
  const nearSourceY =
    edgeCoords.sy + (edgeCoords.ty - edgeCoords.sy) * labelOffset;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        markerEnd={markerEnd}
        style={style}
      />
      <path
        className="react-flow__edge-interaction"
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${nearSourceX}px,${nearSourceY}px)`,
              pointerEvents: "all",
              ...labelBgStyle,
            }}
            className="px-2 py-0.5 rounded shadow-sm text-xs nodrag nopan bg-popover/95 border border-border text-popover-foreground"
          >
            <span style={labelStyle}>{label}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
