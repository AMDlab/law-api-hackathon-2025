"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { TerminalNode as TerminalNodeType } from "@/types/diagram";

interface TerminalNodeData extends Record<string, unknown> {
  node: TerminalNodeType;
}

type TerminalNodeProps = NodeProps<Node<TerminalNodeData>>;

/** 結果に応じたスタイル定義 */
const RESULT_STYLES = {
  pass: {
    container: "bg-emerald-100 border-emerald-500",
    text: "text-emerald-800",
    icon: "✓",
    iconBg: "#10b981", // emerald-500
    handleBg: "#10b981",
  },
  fail: {
    container: "bg-red-100 border-red-500",
    text: "text-red-800",
    icon: "✗",
    iconBg: "#ef4444", // red-500
    handleBg: "#ef4444",
  },
  start: {
    container: "bg-indigo-100 border-indigo-500",
    text: "text-indigo-800",
    icon: "▶",
    iconBg: "#6366f1", // indigo-500
    handleBg: "#6366f1",
  },
  end: {
    container: "bg-gray-100 border-gray-500",
    text: "text-gray-800",
    icon: "■",
    iconBg: "#6b7280", // gray-500
    handleBg: "#6b7280",
  },
  default: {
    container: "bg-gray-100 border-gray-400",
    text: "text-gray-700",
    icon: "○",
    iconBg: "#9ca3af", // gray-400
    handleBg: "#9ca3af",
  },
} as const;

function getResultStyle(result: TerminalNodeType["result"]) {
  return RESULT_STYLES[result] || RESULT_STYLES.default;
}

/**
 * 端子ノード - 開始/終了/結果（角丸長方形）
 */
function TerminalNodeComponent({ data, selected }: TerminalNodeProps) {
  const node = data.node;
  const style = getResultStyle(node.result);
  const isStart = node.result === "start";
  const isEnd = node.result === "end" || node.result === "pass" || node.result === "fail";

  return (
    <div
      className={`
        relative flex items-center justify-center
        min-w-[120px] min-h-[40px] px-4 py-2
        border-2 rounded-full shadow-sm
        ${style.container}
        ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
      `}
    >
      {/* ハンドル - インラインスタイルで色指定 */}
      {!isStart && (
        <>
          <Handle type="target" position={Position.Top} className="!w-2 !h-2" style={{ backgroundColor: style.handleBg }} />
          <Handle type="target" position={Position.Left} className="!w-2 !h-2" style={{ backgroundColor: style.handleBg }} />
        </>
      )}
      {isStart ? (
        <>
          <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" style={{ backgroundColor: style.handleBg }} />
          <Handle type="source" position={Position.Right} className="!w-2 !h-2" style={{ backgroundColor: style.handleBg }} />
        </>
      ) : !isEnd && (
        <>
          <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" style={{ backgroundColor: style.handleBg }} />
          <Handle type="source" position={Position.Right} className="!w-2 !h-2" style={{ backgroundColor: style.handleBg }} />
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
      <div className={`text-center text-xs font-medium ${style.text} leading-tight`}>
        {node.title}
      </div>
    </div>
  );
}

export const TerminalNode = memo(TerminalNodeComponent);

