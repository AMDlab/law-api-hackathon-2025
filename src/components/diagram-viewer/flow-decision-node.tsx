"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { DecisionNode as DecisionNodeType } from "@/types/diagram";

interface FlowDecisionNodeData extends Record<string, unknown> {
  node: DecisionNodeType;
  isFlowDiagram?: boolean;
  nodeWidth?: number;
}

type FlowDecisionNodeProps = NodeProps<Node<FlowDecisionNodeData>>;

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
 * 判定ノード - フローチャート用六角形スタイル
 */
function FlowDecisionNodeComponent({ data, selected }: FlowDecisionNodeProps) {
  const node = data.node;
  const isFlowDiagram = data.isFlowDiagram;
  const nodeWidth = data.nodeWidth;

  if (isFlowDiagram) {
    // フローチャート用：六角形（hexagon）- SVGで描画
    // 幅はpropsから取得、デフォルトは180
    const width = nodeWidth || 180;
    const hasRelatedArticles = node.related_articles && node.related_articles.length > 0;
    const baseHeight = 50;
    const articleLineHeight = 12;
    const height = hasRelatedArticles
      ? baseHeight + (node.related_articles!.length * articleLineHeight)
      : baseHeight;
    const inset = 15; // 左右の尖り具合

    // 六角形のポイント: 左尖り → 上辺 → 右尖り → 下辺
    const points = `${inset},0 ${width - inset},0 ${width},${height / 2} ${width - inset},${height} ${inset},${height} 0,${height / 2}`;

    return (
      <div
        className={`relative flex flex-col items-center justify-center ${selected ? "drop-shadow-lg" : ""}`}
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

        {/* コンテンツ - 折り返しなし */}
        <div
          className="relative z-10 text-center text-[11px] font-medium text-amber-900 leading-tight px-4 whitespace-nowrap"
          style={{ maxWidth: width - 30 }}
        >
          {node.title}
        </div>

        {/* 関連条項（あれば表示、複数の場合は改行） */}
        {hasRelatedArticles && (
          <div className="relative z-10 text-[9px] text-amber-700 text-center flex flex-col mt-0.5">
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

export const FlowDecisionNode = memo(FlowDecisionNodeComponent);
