"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, FileText, Folder, AlertCircle, CheckCircle } from "lucide-react";
import type { LawNode } from "@/lib/parser";

interface DiagramFile {
  /** 機序図ID (例: "A43_P1") */
  diagramId: string;
  /** APIパス */
  path: string;
}

interface LawTreeSelectorProps {
  /** 法令データ（パース済み） */
  lawData: LawNode[];
  /** 法令名 */
  lawName: string;
  /** 法令ID */
  lawId: string;
  /** 利用可能な機序図ファイル一覧 */
  availableDiagrams: DiagramFile[];
  /** 選択時のコールバック (diagramPathは機序図がある場合のみ) */
  onSelect: (diagramPath: string | null, node: LawNode) => void;
  /** 現在選択中のパス */
  selectedPath?: string;
  /** 現在選択中のノードdiagramId */
  selectedDiagramId?: string;
}

/**
 * 法令ツリー選択コンポーネント
 * 法令 > 章 > 条 > 項 > 号 の階層で展開表示
 * 規制文がある項/号にはマーク表示、機序図があればクリック可能
 */
export function LawTreeSelector({
  lawData,
  lawName,
  lawId,
  availableDiagrams,
  onSelect,
  selectedPath,
  selectedDiagramId,
}: LawTreeSelectorProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 機序図IDからパスへのマップ
  const diagramMap = new Map(
    availableDiagrams.map((d) => [d.diagramId, d.path])
  );

  // ノードの展開/折りたたみ
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // 最初の章を展開
  useEffect(() => {
    if (lawData.length > 0) {
      const firstChapter = lawData[0];
      if (firstChapter.type === 'Chapter') {
        setExpandedNodes(new Set([`${firstChapter.type}-${firstChapter.title}`]));
      }
    }
  }, [lawData]);

  // ノードのキーを生成
  const getNodeKey = (node: LawNode, parentKey: string = ""): string => {
    if (node.diagramId) return node.diagramId;
    return `${parentKey}-${node.type}-${node.title}`;
  };

  // ツリーノードをレンダリング
  const renderNode = (node: LawNode, depth: number = 0, parentKey: string = "") => {
    const nodeKey = getNodeKey(node, parentKey);
    const isExpanded = expandedNodes.has(nodeKey);
    const hasChildren = node.children && node.children.length > 0;
    const hasDiagram = node.diagramId && diagramMap.has(node.diagramId);
    const diagramPath = node.diagramId ? diagramMap.get(node.diagramId) : undefined;
    const isSelected = (selectedPath && diagramPath === selectedPath) ||
      (selectedDiagramId && node.diagramId === selectedDiagramId);
    const isClickable = node.type === 'Paragraph' || node.type === 'Item';

    // ノードの種類に応じたスタイル
    const getNodeStyle = () => {
      if (node.type === 'Article') {
        return 'font-medium';
      }
      if (node.type === 'Paragraph' || node.type === 'Item') {
        return node.isRegulation ? 'text-blue-700' : 'text-gray-600';
      }
      return '';
    };

    // インデント計算
    const indent = depth * 16;

    return (
      <div key={nodeKey}>
        <div
          className={`
            flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-gray-100
            ${isSelected ? 'bg-blue-50 text-blue-700' : ''}
          `}
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => {
            if (isClickable) {
              // 項・号の場合はクリックで選択（機序図の有無に関わらず）
              onSelect(diagramPath || null, node);
            } else if (hasChildren) {
              toggleNode(nodeKey);
            }
          }}
        >
          {/* 展開アイコン */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(nodeKey);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {/* アイコン */}
          {node.type === 'Chapter' || node.type === 'Section' ? (
            <Folder className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          ) : node.type === 'Article' ? (
            <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
          ) : hasDiagram ? (
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          ) : node.isRegulation ? (
            <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}

          {/* タイトル */}
          <span className={`text-sm truncate ${getNodeStyle()}`}>
            {node.type === 'Article' && node.caption
              ? `${node.title} ${node.caption}`
              : node.title}
          </span>

          {/* 規制文/機序図バッジ */}
          {node.type === 'Paragraph' || node.type === 'Item' ? (
            <div className="flex gap-1 ml-auto flex-shrink-0">
              {node.isRegulation && !hasDiagram && (
                <span className="text-xs px-1 py-0.5 bg-orange-100 text-orange-600 rounded">
                  規制文
                </span>
              )}
              {hasDiagram && (
                <span className="text-xs px-1 py-0.5 bg-green-100 text-green-600 rounded">
                  機序図
                </span>
              )}
            </div>
          ) : null}
        </div>

        {/* 子ノード */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1, nodeKey))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-2">
      {/* 法令名ヘッダー */}
      <div className="px-4 py-2 bg-gray-50 border-b">
        <div className="font-medium text-sm">{lawName}</div>
        <div className="text-xs text-gray-500">{lawId}</div>
      </div>

      {/* 凡例 */}
      <div className="px-4 py-2 border-b text-xs text-gray-500 flex gap-3">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" /> 機序図あり
        </span>
        <span className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-orange-400" /> 規制文
        </span>
      </div>

      {/* ツリー */}
      <div className="overflow-y-auto">
        {lawData.map((node) => renderNode(node, 0, "root"))}
      </div>
    </div>
  );
}
