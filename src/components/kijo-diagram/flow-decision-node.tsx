"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DecisionNode as DecisionNodeType } from "@/types/diagram";

interface FlowDecisionNodeData {
  node: DecisionNodeType;
  isFlowDiagram?: boolean;
}

/**
 * 判定ノード - フローチャート用六角形スタイル
 */
function FlowDecisionNodeComponent({ data, selected }: NodeProps) {
  const node = (data as FlowDecisionNodeData).node;
  const isFlowDiagram = (data as FlowDecisionNodeData).isFlowDiagram;

  if (isFlowDiagram) {
    // フローチャート用：六角形（hexagon）- SVGで描画
    const width = 120;
    const height = 50;
    const inset = 12; // 左右の尖り具合
    
    // 六角形のポイント: 左尖り → 上辺 → 右尖り → 下辺
    const points = `${inset},0 ${width - inset},0 ${width},${height / 2} ${width - inset},${height} ${inset},${height} 0,${height / 2}`;
    
    return (
      <div
        className={`relative flex items-center justify-center ${selected ? "drop-shadow-lg" : ""}`}
        style={{ width, height }}
      >
        {/* SVG六角形 */}
        <svg
          width={width}
          height={height}
          className="absolute inset-0"
          style={{ overflow: "visible" }}
        >
          <polygon
            points={points}
            fill="#fffbeb"
            stroke="#fbbf24"
            strokeWidth="2"
          />
          {selected && (
            <polygon
              points={points}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeDasharray="none"
            />
          )}
        </svg>
        
        {/* ハンドル（非表示だが接続用） */}
        <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" style={{ top: 0 }} />
        <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" style={{ left: 0 }} />
        <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" style={{ bottom: 0 }} />
        <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" style={{ right: 0 }} />

        {/* コンテンツ */}
        <div className="relative z-10 text-center text-[10px] font-medium text-amber-900 leading-tight px-4 max-w-[100px]">
          {node.title}
        </div>
      </div>
    );
  }

  // 機序図用：アイコン付きボックス
  return (
    <div
      className={`
        relative flex items-center justify-center
        min-w-[140px] h-[50px] px-4 py-2
        bg-amber-100 border-2 border-amber-500 rounded-lg
        shadow-sm
        ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
      `}
    >
      {/* ハンドル */}
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-amber-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-amber-500 !w-2 !h-2" />

      {/* アイコン */}
      <div className="absolute -left-1 -top-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">?</span>
      </div>

      {/* コンテンツ */}
      <div className="text-center text-xs font-medium text-amber-900 leading-tight">
        {node.title}
      </div>
    </div>
  );
}

export const FlowDecisionNode = memo(FlowDecisionNodeComponent);
