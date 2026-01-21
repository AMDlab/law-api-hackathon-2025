"use client";

import { memo } from "react";
import { Handle, Position, useConnection, type NodeProps, type Node } from "@xyflow/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonHandle } from "@/components/button-handle";
import type { TerminalNode as TerminalNodeType } from "@/types/diagram";

interface FlowTerminalNodeData extends Record<string, unknown> {
  node: TerminalNodeType;
  isFlowDiagram?: boolean;
  isEdgeSelected?: boolean;
  hasOutgoing?: boolean;
}

type FlowTerminalNodeProps = NodeProps<Node<FlowTerminalNodeData>>;

/**
 * 関連条項を短い表示形式に変換
 */
function formatRelatedArticle(article: string): string {
  const match = article.match(/^([^:]+)::A([^:]+)(?::P(\d+))?(?::I(\d+))?$/);
  if (!match) return article;

  const [, lawAbbrev, articleNum, paragraphNum, itemNum] = match;
  const articleDisplay = articleNum.includes("_")
    ? articleNum.replace(/_/g, "条の")
    : articleNum + "条";

  let display = `${lawAbbrev}${articleDisplay}`;
  if (paragraphNum) display += `${paragraphNum}項`;
  if (itemNum) display += `${itemNum}号`;

  return display;
}

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
  const connectionInProgress = useConnection((connection) => connection.inProgress);
  const showButton =
    !connectionInProgress && !data.isEdgeSelected && !data.hasOutgoing;

  // フローチャート用：シンプルな角丸ボックス（ハンドル非表示）
  if (isFlowDiagram) {
    const hasRelatedArticles = node.related_articles && node.related_articles.length > 0;

    return (
      <div
        className={`
          relative flex flex-col items-center justify-center
          min-w-[120px] min-h-[50px] px-4 py-2
          border-2 rounded-full
          ${style.flow}
          ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
        `}
      >
        {/* ハンドル（ReactFlow標準表示） */}
        {!isStart && (
          <>
          <Handle type="target" id="target-top" position={Position.Top} className="opacity-0" />
          <Handle type="target" id="target-left" position={Position.Left} className="opacity-0" />
          <Handle type="target" id="target-bottom" position={Position.Bottom} className="opacity-0" />
          <Handle type="target" id="target-right" position={Position.Right} className="opacity-0" />
          </>
        )}
        {(isStart || !isEnd) && (
          <>
            <ButtonHandle type="source" position={Position.Bottom} showButton={showButton}>
              <Button size="sm" variant="secondary" className="h-6 w-6 rounded-full p-0 border-2 border-gray-300">
                <Plus size={8} />
              </Button>
            </ButtonHandle>
          </>
        )}

        {/* コンテンツ */}
        <div className="text-center text-xs font-medium leading-tight">
          {node.title}
        </div>

        {/* 関連条項（あれば表示、複数の場合は改行） */}
        {hasRelatedArticles && (
          <div className="text-[9px] opacity-75 text-center flex flex-col mt-0.5">
            {node.related_articles!.map((article, i) => (
              <span key={i}>{formatRelatedArticle(article)}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 機序図用：アイコン付きボックス
  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        min-w-[120px] min-h-[50px] px-4 py-2
        border-2 rounded-full shadow-sm
        ${style.kijo}
        ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
      `}
    >
      {/* ハンドル - インラインスタイルで色指定 */}
      {!isStart && (
        <>
          <Handle type="target" id="target-top" position={Position.Top} className="opacity-0" style={{ backgroundColor: style.iconBg }} />
          <Handle type="target" id="target-left" position={Position.Left} className="opacity-0" style={{ backgroundColor: style.iconBg }} />
          <Handle type="target" id="target-bottom" position={Position.Bottom} className="opacity-0" style={{ backgroundColor: style.iconBg }} />
          <Handle type="target" id="target-right" position={Position.Right} className="opacity-0" style={{ backgroundColor: style.iconBg }} />
        </>
      )}
      {(isStart || !isEnd) && (
        <ButtonHandle type="source" position={Position.Right} showButton={showButton}>
          <Button size="sm" variant="secondary" className="h-6 w-6 rounded-full p-0 border-2 border-gray-300">
            <Plus size={8} />
          </Button>
        </ButtonHandle>
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

      {/* 関連条項（あれば表示、複数の場合は改行） */}
      {node.related_articles && node.related_articles.length > 0 && (
        <div className={`mt-1 text-[10px] opacity-75 text-center flex flex-col`}>
          {node.related_articles.map((article, i) => (
            <span key={i}>{formatRelatedArticle(article)}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export const FlowTerminalNode = memo(FlowTerminalNodeComponent);
