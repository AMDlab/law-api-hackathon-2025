"use client";

import { useCallback, useMemo, useState, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type OnSelectionChangeFunc,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { KijoDiagram, DiagramNode } from "@/types/diagram";
import { detectCycle, validateEdgeReferences } from "@/lib/validation";
import { InformationNode } from "./information-node";
import { ProcessNode } from "./process-node";
import { NodeDetailPanel } from "./node-detail-panel";
import { ExportButton } from "./export-button";
import { HelpButton } from "./help-button";

// カスタムノードタイプの登録
const nodeTypes = {
  information: InformationNode,
  process: ProcessNode,
};

interface KijoDiagramViewerProps {
  diagram: KijoDiagram;
  className?: string;
  articleContent?: string;
  articleTitle?: string;
}

/**
 * 機序図JSONからReact Flowのノード・エッジに変換
 */
function convertToFlowElements(diagram: KijoDiagram): {
  nodes: Node[];
  edges: Edge[];
} {
  // ノードの変換
  // 自動レイアウト: 情報と処理を交互に配置
  const nodes: Node[] = [];
  const nodeMap = new Map<string, DiagramNode>();

  // ノードマップを作成
  diagram.nodes.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  // トポロジカルソートでノードの順序を決定
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // このノードへの入力エッジを探す
    diagram.edges
      .filter((e) => e.to === nodeId)
      .forEach((e) => visit(e.from));

    order.push(nodeId);
  }

  diagram.nodes.forEach((node) => visit(node.id));

  // 列ごとにノードをグループ化
  const columns: string[][] = [];
  const nodeColumn = new Map<string, number>();

  order.forEach((nodeId) => {
    // 入力ノードの最大列 + 1
    const inputEdges = diagram.edges.filter((e) => e.to === nodeId);
    let col = 0;
    inputEdges.forEach((e) => {
      const inputCol = nodeColumn.get(e.from) ?? -1;
      col = Math.max(col, inputCol + 1);
    });

    nodeColumn.set(nodeId, col);
    if (!columns[col]) columns[col] = [];
    columns[col].push(nodeId);
  });

  // バリセンター法で列内のノード順序を最適化（エッジ交差を減らす）
  const nodeRow = new Map<string, number>();

  // 初期行位置を設定
  columns.forEach((columnNodes, colIndex) => {
    columnNodes.forEach((nodeId, rowIndex) => {
      nodeRow.set(nodeId, rowIndex);
    });
  });

  // 数回繰り返して最適化
  for (let iter = 0; iter < 4; iter++) {
    // 左から右へ（前の列の位置に基づいてソート）
    columns.forEach((columnNodes, colIndex) => {
      if (colIndex === 0) return;

      columnNodes.sort((a, b) => {
        // 入力ノードの平均行位置を計算
        const getAvgInputRow = (nodeId: string) => {
          const inputs = diagram.edges.filter(e => e.to === nodeId);
          if (inputs.length === 0) return nodeRow.get(nodeId) ?? 0;
          const sum = inputs.reduce((acc, e) => acc + (nodeRow.get(e.from) ?? 0), 0);
          return sum / inputs.length;
        };
        return getAvgInputRow(a) - getAvgInputRow(b);
      });

      // 新しい行位置を更新
      columnNodes.forEach((nodeId, rowIndex) => {
        nodeRow.set(nodeId, rowIndex);
      });
    });

    // 右から左へ（後の列の位置に基づいてソート）
    for (let colIndex = columns.length - 2; colIndex >= 0; colIndex--) {
      const columnNodes = columns[colIndex];

      columnNodes.sort((a, b) => {
        // 出力ノードの平均行位置を計算
        const getAvgOutputRow = (nodeId: string) => {
          const outputs = diagram.edges.filter(e => e.from === nodeId);
          if (outputs.length === 0) return nodeRow.get(nodeId) ?? 0;
          const sum = outputs.reduce((acc, e) => acc + (nodeRow.get(e.to) ?? 0), 0);
          return sum / outputs.length;
        };
        return getAvgOutputRow(a) - getAvgOutputRow(b);
      });

      // 新しい行位置を更新
      columnNodes.forEach((nodeId, rowIndex) => {
        nodeRow.set(nodeId, rowIndex);
      });
    }
  }

  // 位置を計算
  const NODE_WIDTH = 160;
  const NODE_HEIGHT = 60;
  const COL_GAP = 200;
  const ROW_GAP = 100;

  columns.forEach((columnNodes, colIndex) => {
    columnNodes.forEach((nodeId, rowIndex) => {
      const diagramNode = nodeMap.get(nodeId);
      if (!diagramNode) return;

      const x = colIndex * COL_GAP + 50;
      const y = rowIndex * ROW_GAP + 50;

      nodes.push({
        id: nodeId,
        type: diagramNode.type,
        position: { x, y },
        data: { node: diagramNode },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });
  });

  // エッジの変換
  const edges: Edge[] = diagram.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: "smoothstep",
    animated: edge.role === "output",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: "#666",
    },
    style: {
      stroke: edge.role === "supporting" ? "#22c55e" : "#666",
      strokeWidth: 2,
    },
  }));

  return { nodes, edges };
}

/**
 * グラフの整合性を検証
 */
function validateGraph(diagram: KijoDiagram): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // エッジ参照の検証
  const edgeValidation = validateEdgeReferences(diagram.nodes, diagram.edges);
  if (!edgeValidation.valid) {
    warnings.push(
      `存在しないノードへの参照があります: ${edgeValidation.invalidEdges
        .map((e) => `${e.from} → ${e.to}`)
        .join(", ")}`
    );
  }

  // 循環参照の検出
  if (detectCycle(diagram.nodes, diagram.edges)) {
    warnings.push("グラフに循環参照が含まれています");
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * 内部コンポーネント（ReactFlowコンテキスト内で使用）
 */
function KijoDiagramViewerInner({ diagram, className, articleContent, articleTitle }: KijoDiagramViewerProps) {
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  // グラフの検証
  const validation = useMemo(() => validateGraph(diagram), [diagram]);

  // 初期ノード・エッジを計算
  const initialElements = useMemo(
    () => convertToFlowElements(diagram),
    [diagram]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialElements.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialElements.edges);

  // 選択変更時のハンドラ
  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (selectedNodes.length > 0) {
        const nodeData = selectedNodes[0].data as { node: DiagramNode };
        setSelectedNode(nodeData.node);
      } else {
        setSelectedNode(null);
      }
    },
    []
  );

  // fitViewをトリガーする関数
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);


  return (
    <div className={`flex h-full ${className || ""}`}>
      {/* メイン図 */}
      <div className="flex-1 h-full relative" ref={flowRef}>
        {/* ヘルプ・エクスポートボタン */}
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <HelpButton />
          <ExportButton
            diagram={diagram}
            articleContent={articleContent}
            articleTitle={articleTitle}
            flowRef={flowRef}
            onFitView={handleFitView}
          />
        </div>
        {/* 警告表示 */}
        {!validation.valid && (
          <div className="absolute top-2 left-2 z-10 bg-yellow-50 border border-yellow-300 rounded-md p-3 max-w-md shadow-sm">
            <div className="font-medium text-yellow-800 text-sm mb-1">⚠️ グラフ検証警告</div>
            <ul className="text-xs text-yellow-700 list-disc list-inside">
              {validation.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* 詳細パネル */}
      <div className="w-80 border-l bg-white overflow-y-auto">
        {/* 選択ノード詳細 */}
        <NodeDetailPanel node={selectedNode} />
      </div>
    </div>
  );
}

/**
 * 機序図ビューアーコンポーネント
 */
export function KijoDiagramViewer(props: KijoDiagramViewerProps) {
  return (
    <ReactFlowProvider>
      <KijoDiagramViewerInner {...props} />
    </ReactFlowProvider>
  );
}
