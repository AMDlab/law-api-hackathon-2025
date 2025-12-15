"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TerminalNode as TerminalNodeType } from "@/types/diagram";

interface TerminalNodeData {
  node: TerminalNodeType;
}

/**
 * 結果に応じたスタイルを取得
 */
function getResultStyle(result: TerminalNodeType["result"]) {
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
 * 端子ノード - 開始/終了/結果（角丸長方形）
 */
function TerminalNodeComponent({ data, selected }: NodeProps) {
  const node = (data as TerminalNodeData).node;
  const style = getResultStyle(node.result);

  // start ノードは source のみ、その他は target のみ（または両方）
  const isStart = node.result === "start";
  const isEnd = node.result === "end" || node.result === "pass" || node.result === "fail";

  return (
    <div
      className={`
        relative flex items-center justify-center
        min-w-[120px] min-h-[40px] px-4 py-2
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

export const TerminalNode = memo(TerminalNodeComponent);

