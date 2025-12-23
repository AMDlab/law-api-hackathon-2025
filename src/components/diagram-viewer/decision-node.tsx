"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { DecisionNode as DecisionNodeType } from "@/types/diagram";

interface DecisionNodeData extends Record<string, unknown> {
  node: DecisionNodeType;
}

type DecisionNodeProps = NodeProps<Node<DecisionNodeData>>;

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

/**
 * 判定ノード - 機序図用（アイコン付き角丸ボックス）
 */
function DecisionNodeComponent({ data, selected }: DecisionNodeProps) {
  const node = data.node;

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        min-w-[140px] min-h-[50px] px-4 py-2
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

      {/* 関連条項（あれば表示、複数の場合は改行） */}
      {node.related_articles && node.related_articles.length > 0 && (
        <div className="mt-1 text-[10px] text-amber-700 text-center flex flex-col">
          {node.related_articles.map((article, i) => (
            <span key={i}>{formatRelatedArticle(article)}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export const DecisionNode = memo(DecisionNodeComponent);

