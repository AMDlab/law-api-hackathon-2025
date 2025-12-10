"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { InformationNode as InformationNodeType } from "@/types/diagram";
import { getInformationTailwindClass } from "@/types/diagram";

interface InformationNodeData {
  node: InformationNodeType;
}

interface InformationNodeProps {
  data: InformationNodeData;
  selected?: boolean;
}

/**
 * [情報]ノード - 矩形で表示
 * 視認情報の場合は肌色、それ以外は白
 */
export const InformationNode = memo(function InformationNode({
  data,
  selected,
}: InformationNodeProps) {
  const { node } = data;
  const colorClass = getInformationTailwindClass(node.propertyType);

  return (
    <div
      className={`
        px-4 py-3 min-w-[120px] max-w-[200px]
        border-2 rounded
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
        {node.symbol && (
          <span className="text-blue-600 mr-1">[{node.symbol}]</span>
        )}
        {node.title}
      </div>

      {/* 複数マーク */}
      {node.plurality === "multiple" && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-200 border border-gray-400 rounded-sm" />
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-gray-500"
      />
    </div>
  );
});
