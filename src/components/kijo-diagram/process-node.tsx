"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { ProcessNode as ProcessNodeType } from "@/types/diagram";
import { getProcessTailwindClass } from "@/types/diagram";

interface ProcessNodeData {
  node: ProcessNodeType;
}

interface ProcessNodeProps {
  data: ProcessNodeData;
  selected?: boolean;
}

/**
 * [処理]ノード - 角丸矩形で表示
 */
export const ProcessNode = memo(function ProcessNode({
  data,
  selected,
}: ProcessNodeProps) {
  const { node } = data;
  const colorClass = getProcessTailwindClass(node.processType);

  return (
    <div
      className={`
        px-4 py-3 min-w-[120px] max-w-[200px]
        border-2 rounded-xl
        shadow-sm
        transition-all
        ${colorClass}
        ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-500"
      />

      {/* タイトル */}
      <div className="font-medium text-sm text-center text-gray-800">
        {node.title}
      </div>

      {/* 反復マーク */}
      {node.iteration === "iterative" && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-200 border border-gray-400 rounded-full" />
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-gray-500"
      />
    </div>
  );
});
