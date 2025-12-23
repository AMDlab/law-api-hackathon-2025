"use client";

import {
  useInternalNode,
  getBezierPath,
  EdgeLabelRenderer,
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
  label,
  labelStyle,
  labelBgStyle,
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

  // ラベル位置を分岐ノードの直後（sourceから20%の位置）に配置
  const labelOffset = 0.2;
  const nearSourceX = sx + (tx - sx) * labelOffset;
  const nearSourceY = sy + (ty - sy) * labelOffset;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        style={style}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${nearSourceX}px,${nearSourceY}px)`,
              pointerEvents: "all",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              border: "1px solid #e5e7eb",
              ...labelBgStyle,
            }}
            className="px-2 py-0.5 rounded shadow-sm text-xs nodrag nopan"
          >
            <span style={labelStyle}>{label}</span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
