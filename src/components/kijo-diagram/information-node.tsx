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
 * 関連条項を短い表示形式に変換
 * "令::A109_9" → "令109条の9"
 */
function formatRelatedArticle(article: string): string {
  const match = article.match(/^([^:]+)::A([^:]+)(?::P(\d+))?(?::I(\d+))?$/);
  if (!match) return article;

  const [, lawAbbrev, articleNum, paragraphNum, itemNum] = match;

  // 条番号の表示（例: 109_9 → 109条の9）
  const articleDisplay = articleNum.includes("_")
    ? articleNum.replace(/_/g, "条の")
    : articleNum + "条";

  let display = `${lawAbbrev}${articleDisplay}`;
  if (paragraphNum) display += `${paragraphNum}項`;
  if (itemNum) display += `${itemNum}号`;

  return display;
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
  const colorClass = getInformationTailwindClass(node.property_type);

  return (
    <div
      className={`
        px-4 py-2 min-h-[60px]
        flex flex-col justify-center
        border-2 rounded
        shadow-sm
        transition-all
        whitespace-nowrap
        ${colorClass}
        ${selected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
      `}
    >
      <Handle type="target" position={Position.Left} className="!opacity-0" />

      {/* タイトル */}
      <div className="font-medium text-sm text-center text-gray-800">
        {node.symbol && (
          <span className="text-blue-600 mr-1">[{node.symbol}]</span>
        )}
        {node.title}
      </div>

      {/* 関連条項（あれば表示、複数の場合は改行） */}
      {node.related_articles && node.related_articles.length > 0 && (
        <div className="mt-1 text-xs text-gray-500 text-center flex flex-col">
          {node.related_articles.map((article, i) => (
            <span key={i}>{formatRelatedArticle(article)}</span>
          ))}
        </div>
      )}

      {/* 複数マーク */}
      {node.plurality === "multiple" && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-200 border border-gray-400 rounded-sm" />
      )}

      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
});
