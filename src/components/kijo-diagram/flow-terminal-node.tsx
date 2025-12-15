"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { TerminalNode as TerminalNodeType } from "@/types/diagram";

interface FlowTerminalNodeData extends Record<string, unknown> {
  node: TerminalNodeType;
  isFlowDiagram?: boolean;
}

type FlowTerminalNodeProps = NodeProps<Node<FlowTerminalNodeData>>;

/** 統合スタイル定義 */
const TERMINAL_STYLES = {
  pass: {
    flow: "bg-emerald-50 border-emerald-400 text-emerald-700",
    kijo: "bg-emerald-100 border-emerald-500 text-emerald-800",
    icon: "✓",
    iconBg: "#10b981",
  },
  fail: {
    flow: "bg-red-50 border-red-400 text-red-700",
    kijo: "bg-red-100 border-red-500 text-red-800",
    icon: "✗",
    iconBg: "#ef4444",
  },
  start: {
    flow: "bg-slate-100 border-slate-400 text-slate-700",
    kijo: "bg-indigo-100 border-indigo-500 text-indigo-800",
    icon: "▶",
    iconBg: "#6366f1",
  },
  end: {
    flow: "bg-slate-100 border-slate-400 text-slate-700",
    kijo: "bg-gray-100 border-gray-500 text-gray-800",
    icon: "■",
    iconBg: "#6b7280",
  },
  default: {
    flow: "bg-gray-50 border-gray-400 text-gray-700",
    kijo: "bg-gray-100 border-gray-400 text-gray-700",
    icon: "○",
    iconBg: "#9ca3af",
  },
} as const;

function getStyle(result: TerminalNodeType["result"]) {
  return TERMINAL_STYLES[result] || TERMINAL_STYLES.default;
}

/**
 * 端子ノード - フローチャート/機序図両対応
 */
function FlowTerminalNodeComponent({ data, selected }: FlowTerminalNodeProps) {
  const node = data.node;
  const isFlowDiagram = data.isFlowDiagram;
  const isStart = node.result === "start";
  const isEnd = node.result === "end" || node.result === "pass" || node.result === "fail";
  const style = getStyle(node.result);

  // フローチャート用：シンプルな角丸ボックス（ハンドル非表示）
  if (isFlowDiagram) {
    return (
      <div
        className={`
          relative flex items-center justify-center
          min-w-[120px] h-[50px] px-4
          border-2 rounded-full
          ${style.flow}
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
        {(isStart || !isEnd) && (
          <>
            <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
            <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
          </>
        )}

        {/* コンテンツ */}
        <div className="text-center text-xs font-medium leading-tight">
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
        min-w-[120px] h-[50px] px-4 py-2
        border-2 rounded-full shadow-sm
        ${style.kijo}
        ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
      `}
    >
      {/* ハンドル - インラインスタイルで色指定 */}
      {!isStart && (
        <>
          <Handle type="target" position={Position.Top} className="!w-2 !h-2" style={{ backgroundColor: style.iconBg }} />
          <Handle type="target" position={Position.Left} className="!w-2 !h-2" style={{ backgroundColor: style.iconBg }} />
        </>
      )}
      {(isStart || !isEnd) && (
        <>
          <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" style={{ backgroundColor: style.iconBg }} />
          <Handle type="source" position={Position.Right} className="!w-2 !h-2" style={{ backgroundColor: style.iconBg }} />
        </>
      )}

      {/* アイコン */}
      <div
        className="absolute -left-1 -top-1 w-5 h-5 rounded-full flex items-center justify-center"
        style={{ backgroundColor: style.iconBg }}
      >
        <span className="text-white text-xs font-bold">{style.icon}</span>
      </div>

      {/* コンテンツ */}
      <div className="text-center text-xs font-medium leading-tight">
        {node.title}
      </div>
    </div>
  );
}

export const FlowTerminalNode = memo(FlowTerminalNodeComponent);
