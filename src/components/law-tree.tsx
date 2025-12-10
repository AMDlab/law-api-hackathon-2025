'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, CheckCircle, AlertCircle } from 'lucide-react';
import type { LawNode } from '@/lib/parser';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LawTreeProps {
  nodes: LawNode[];
  onSelect: (node: LawNode) => void;
  selectedDiagramId?: string;
  availableDiagramIds?: Set<string>;
  showOnlyWithDiagram?: boolean;
  searchQuery?: string;
}

// ノードが検索クエリにマッチするか（タイトル、条番号、内容で検索）
function nodeMatchesSearch(node: LawNode, query: string): boolean {
  if (!query) return true;
  const lowerQuery = query.toLowerCase();

  // タイトルでマッチ
  if (node.title?.toLowerCase().includes(lowerQuery)) return true;
  // キャプション（条文見出し）でマッチ
  if (node.caption?.toLowerCase().includes(lowerQuery)) return true;
  // 条番号でマッチ（例: "43" で第43条を検索）
  if (node.articleNum?.includes(query)) return true;
  // 内容でマッチ
  if (node.content?.toLowerCase().includes(lowerQuery)) return true;

  return false;
}

// ノードまたはその子孫が検索クエリにマッチするかを再帰的にチェック
function hasDescendantMatchingSearch(node: LawNode, query: string): boolean {
  if (!query) return true;
  if (nodeMatchesSearch(node, query)) return true;
  if (node.children) {
    return node.children.some(child => hasDescendantMatchingSearch(child, query));
  }
  return false;
}

export function LawTree({ nodes, onSelect, selectedDiagramId, availableDiagramIds, showOnlyWithDiagram, searchQuery }: LawTreeProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {nodes.map((node, index) => (
          <TreeNode
            key={`${node.type}-${index}`}
            node={node}
            depth={0}
            onSelect={onSelect}
            selectedDiagramId={selectedDiagramId}
            availableDiagramIds={availableDiagramIds}
            showOnlyWithDiagram={showOnlyWithDiagram}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface TreeNodeProps {
  node: LawNode;
  depth: number;
  onSelect: (node: LawNode) => void;
  selectedDiagramId?: string;
  availableDiagramIds?: Set<string>;
  showOnlyWithDiagram?: boolean;
  searchQuery?: string;
}

// ノードまたはその子孫に機序図があるかを再帰的にチェック
function hasDescendantWithDiagram(node: LawNode, availableDiagramIds?: Set<string>): boolean {
  if (!availableDiagramIds) return false;
  if (node.diagramId && availableDiagramIds.has(node.diagramId)) return true;
  if (node.children) {
    return node.children.some(child => hasDescendantWithDiagram(child, availableDiagramIds));
  }
  return false;
}

function TreeNode({ node, depth, onSelect, selectedDiagramId, availableDiagramIds, showOnlyWithDiagram, searchQuery }: TreeNodeProps) {
  const hasSearchQuery = searchQuery && searchQuery.length > 0;
  const [isExpanded, setIsExpanded] = useState(depth < 1 || hasSearchQuery);
  const hasChildren = node.children && node.children.length > 0;
  const isSelectable = node.type === 'Paragraph' || node.type === 'Item';
  const isSelected = selectedDiagramId && node.diagramId === selectedDiagramId;
  const hasDiagram = availableDiagramIds && node.diagramId && availableDiagramIds.has(node.diagramId);
  const hasChildWithDiagram = hasDescendantWithDiagram(node, availableDiagramIds);

  // 検索フィルタリング
  if (searchQuery && searchQuery.length > 0) {
    if (!hasDescendantMatchingSearch(node, searchQuery)) {
      return null;
    }
  }

  // フィルタリング: 機序図ありのみ表示の場合、機序図がない項目は非表示
  if (showOnlyWithDiagram) {
    if (isSelectable && !hasDiagram) {
      return null;
    }
    // 親ノードは、子孫に機序図があれば表示
    if (!isSelectable && !hasDescendantWithDiagram(node, availableDiagramIds)) {
      return null;
    }
  }

  const handleClick = () => {
    if (isSelectable) {
      onSelect(node);
    } else if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const getIcon = () => {
    if (node.type === 'Chapter' || node.type === 'Section' || node.type === 'Part') {
      // 子孫に機序図があれば緑、なければ黄色
      const color = hasChildWithDiagram ? 'text-green-600' : 'text-yellow-600';
      return <Folder className={`w-4 h-4 ${color} flex-shrink-0`} />;
    }
    if (node.type === 'Article') {
      // 子孫に機序図があれば緑、なければグレー
      const color = hasChildWithDiagram ? 'text-green-600' : 'text-gray-500';
      return <FileText className={`w-4 h-4 ${color} flex-shrink-0`} />;
    }
    if (hasDiagram) {
      return <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />;
    }
    if (node.isRegulation) {
      return <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />;
    }
    return <span className="w-4 h-4 flex-shrink-0" />;
  };

  const getTitle = () => {
    if (node.type === 'Article' && node.caption) {
      return `${node.title} ${node.caption}`;
    }
    return node.title;
  };

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 py-1 px-1 rounded cursor-pointer text-sm
          hover:bg-gray-100
          ${isSelected ? 'bg-blue-100 text-blue-700' : ''}
          ${isSelectable ? 'hover:bg-blue-50' : ''}
        `}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleClick}
      >
        {/* 展開アイコン */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* アイコン */}
        {getIcon()}

        {/* タイトル */}
        <span className="truncate">{getTitle()}</span>

        {/* バッジ */}
        {isSelectable && (
          <div className="ml-auto flex gap-1 flex-shrink-0">
            {hasDiagram && (
              <span className="text-xs px-1 py-0.5 bg-green-100 text-green-700 rounded">
                図
              </span>
            )}
            {node.isRegulation && !hasDiagram && (
              <span className="text-xs px-1 py-0.5 bg-orange-100 text-orange-600 rounded">
                規制
              </span>
            )}
          </div>
        )}
      </div>

      {/* 子ノード */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child, index) => (
            <TreeNode
              key={`${child.type}-${index}`}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedDiagramId={selectedDiagramId}
              availableDiagramIds={availableDiagramIds}
              showOnlyWithDiagram={showOnlyWithDiagram}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}
