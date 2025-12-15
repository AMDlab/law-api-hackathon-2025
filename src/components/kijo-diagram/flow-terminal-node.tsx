"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TerminalNode as TerminalNodeType } from "@/types/diagram";

interface FlowTerminalNodeData {
  node: TerminalNodeType;
  isFlowDiagram?: boolean;
}

/**
 * 結果に応じたスタイルを取得（フロー図用）
 */
function getFlowResultStyle(result: TerminalNodeType["result"]) {
  switch (result) {
    case "pass":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-400",
        text: "text-emerald-700",
      };
    case "fail":
      return {
        bg: "bg-red-50",
        border: "border-red-400",
        text: "text-red-700",
      };
    case "start":
      return {
        bg: "bg-slate-100",
        border: "border-slate-400",
        text: "text-slate-700",
      };
    case "end":
      return {
        bg: "bg-slate-100",
        border: "border-slate-400",
        text: "text-slate-700",
      };
    default:
      return {
        bg: "bg-gray-50",
        border: "border-gray-400",
        text: "text-gray-700",
      };
  }
}

/**
 * 結果に応じたスタイルを取得（機序図用）
 */
function getKijoResultStyle(result: TerminalNodeType["result"]) {
  switch (result) {
    case "pass":
      return {
        bg: "bg-emerald-100",
        border: "border-emerald-500",
        text: "text-emerald-800",
        icon: "✓",
        iconBg: "bg-emerald-500",
      };
    case "fail":
      return {
        bg: "bg-red-100",
        border: "border-red-500",
        text: "text-red-800",
        icon: "✗",
        iconBg: "bg-red-500",
      };
    case "start":
      return {
        bg: "bg-indigo-100",
        border: "border-indigo-500",
        text: "text-indigo-800",
        icon: "▶",
        iconBg: "bg-indigo-500",
      };
    case "end":
      return {
        bg: "bg-gray-100",
        border: "border-gray-500",
        text: "text-gray-800",
        icon: "■",
        iconBg: "bg-gray-500",
      };
    default:
      return {
        bg: "bg-gray-100",
        border: "border-gray-400",
        text: "text-gray-700",
        icon: "○",
        iconBg: "bg-gray-400",
      };
  }
}

/**
 * 端子ノード - フローチャート用角丸長方形
 */
function FlowTerminalNodeComponent({ data, selected }: NodeProps) {
  const node = (data as FlowTerminalNodeData).node;
  const isFlowDiagram = (data as FlowTerminalNodeData).isFlowDiagram;
  const isStart = node.result === "start";
  const isEnd = node.result === "end" || node.result === "pass" || node.result === "fail";

  if (isFlowDiagram) {
    const style = getFlowResultStyle(node.result);
    
    // フローチャート用：シンプルな角丸ボックス
    return (
      <div
        className={`
          relative flex items-center justify-center
          min-w-[120px] h-[50px] px-4
          ${style.bg} border-2 ${style.border}
          rounded-full
          ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
        `}
      >
        {/* ハンドル（非表示） */}
        {!isStart && (
          <>
            <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />
            <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
          </>
        )}
        {!isEnd && (
          <>
            <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
            <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
          </>
        )}
        {isStart && (
          <>
            <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
            <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
          </>
        )}

        {/* コンテンツ */}
        <div className={`text-center text-xs font-medium ${style.text} leading-tight`}>
          {node.title}
        </div>
      </div>
    );
  }

  // 機序図用：アイコン付きボックス
  const style = getKijoResultStyle(node.result);
  
  return (
    <div
      className={`
        relative flex items-center justify-center
        min-w-[120px] h-[50px] px-4 py-2
        ${style.bg} border-2 ${style.border}
        rounded-full shadow-sm
        ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
      `}
    >
      {/* ハンドル */}
      {!isStart && (
        <>
          <Handle type="target" position={Position.Top} className={`!${style.iconBg} !w-2 !h-2`} />
          <Handle type="target" position={Position.Left} className={`!${style.iconBg} !w-2 !h-2`} />
        </>
      )}
      {!isEnd && (
        <>
          <Handle type="source" position={Position.Bottom} className={`!${style.iconBg} !w-2 !h-2`} />
          <Handle type="source" position={Position.Right} className={`!${style.iconBg} !w-2 !h-2`} />
        </>
      )}
      {isStart && (
        <>
          <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-2 !h-2" />
          <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-2 !h-2" />
        </>
      )}

      {/* アイコン */}
      <div className={`absolute -left-1 -top-1 w-5 h-5 ${style.iconBg} rounded-full flex items-center justify-center`}>
        <span className="text-white text-xs font-bold">{style.icon}</span>
      </div>

      {/* コンテンツ */}
      <div className={`text-center text-xs font-medium ${style.text} leading-tight`}>
        {node.title}
      </div>
    </div>
  );
}

export const FlowTerminalNode = memo(FlowTerminalNodeComponent);
