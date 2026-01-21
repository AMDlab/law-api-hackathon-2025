import { Position, type InternalNode } from "@xyflow/react";

// ノードの端からエッジが出る位置を計算するユーティリティ

function getNodeIntersection(
  intersectionNode: InternalNode,
  targetNode: InternalNode,
): { x: number; y: number } {
  const {
    width: intersectionNodeWidth,
    height: intersectionNodeHeight,
    positionAbsolute: intersectionNodePosition,
  } = intersectionNode.measured
    ? {
        ...intersectionNode.measured,
        positionAbsolute: intersectionNode.internals.positionAbsolute,
      }
    : {
        width: 150,
        height: 60,
        positionAbsolute: intersectionNode.internals.positionAbsolute,
      };

  const targetPosition = targetNode.internals.positionAbsolute;
  const targetWidth = targetNode.measured?.width ?? 150;
  const targetHeight = targetNode.measured?.height ?? 60;

  const w = (intersectionNodeWidth ?? 150) / 2;
  const h = (intersectionNodeHeight ?? 60) / 2;

  const x2 = (intersectionNodePosition?.x ?? 0) + w;
  const y2 = (intersectionNodePosition?.y ?? 0) + h;
  const x1 = (targetPosition?.x ?? 0) + (targetWidth ?? 150) / 2;
  const y1 = (targetPosition?.y ?? 0) + (targetHeight ?? 60) / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

function getEdgePosition(
  node: InternalNode,
  intersectionPoint: { x: number; y: number },
): Position {
  const n = node.internals.positionAbsolute;
  const nx = n?.x ?? 0;
  const ny = n?.y ?? 0;
  const nw = node.measured?.width ?? 150;
  const nh = node.measured?.height ?? 60;

  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);
  if (px <= Math.round(nx)) return Position.Left;
  if (px >= Math.round(nx + nw)) return Position.Right;
  if (py <= Math.round(ny)) return Position.Top;
  if (py >= Math.round(ny + nh)) return Position.Bottom;

  return Position.Top;
}

// 矢印がノードに隠れないようにオフセットを適用
const ARROW_OFFSET = 5;

export function getEdgeParams(
  source: InternalNode,
  target: InternalNode,
): {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePos: Position;
  targetPos: Position;
} {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  // ターゲット側にオフセットを適用して矢印が見えるようにする
  let tx = targetIntersectionPoint.x;
  let ty = targetIntersectionPoint.y;

  switch (targetPos) {
    case Position.Top:
      ty -= ARROW_OFFSET;
      break;
    case Position.Bottom:
      ty += ARROW_OFFSET;
      break;
    case Position.Left:
      tx -= ARROW_OFFSET;
      break;
    case Position.Right:
      tx += ARROW_OFFSET;
      break;
  }

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx,
    ty,
    sourcePos,
    targetPos,
  };
}
