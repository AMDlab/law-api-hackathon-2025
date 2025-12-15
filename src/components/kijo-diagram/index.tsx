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
import Dagre from "@dagrejs/dagre";

import type { KijoDiagram, DiagramNode } from "@/types/diagram";
import { detectCycle, validateEdgeReferences } from "@/lib/validation";
import { InformationNode } from "./information-node";
import { ProcessNode } from "./process-node";
import { NodeDetailPanel } from "./node-detail-panel";
import { ExportButton } from "./export-button";
import { HelpButton } from "./help-button";
import { FloatingEdge } from "./floating-edge";

// カスタムノードタイプの登録
const nodeTypes = {
  information: InformationNode,
  process: ProcessNode,
};

// カスタムエッジタイプの登録
const edgeTypes = {
  floating: FloatingEdge,
};

interface KijoDiagramViewerProps {
  diagram: KijoDiagram;
  className?: string;
  articleContent?: string;
  articleTitle?: string;
  onNavigate?: (lawId: string, diagramId: string) => void;
}

// ノードサイズ定数
const NODE_HEIGHT = 60;
const MIN_NODE_WIDTH = 120;
const CHAR_WIDTH = 14; // 日本語文字の概算幅
const PADDING = 40; // 左右のパディング

/**
 * ノードの幅をタイトルから計算
 */
function calculateNodeWidth(node: DiagramNode): number {
  let titleLength = node.title.length;
  
  // 情報ノードの場合、シンボルの分を追加
  if (node.type === "information" && node.symbol) {
    titleLength += node.symbol.length + 3; // "[X] " の分
  }
  
  const calculatedWidth = titleLength * CHAR_WIDTH + PADDING;
  return Math.max(MIN_NODE_WIDTH, calculatedWidth);
}

/**
 * エッジの色を役割に応じて決定
 * 手引書の色分け規則:
 * - input: 青 ([情報]から[処理]へのインプット)
 * - output: 赤 ([処理]から[情報]へのアウトプット)
 * - primary: 青 (整合確認の正規情報)
 * - supporting: 緑 (整合確認の裏付け情報)
 */
function getEdgeColor(role?: string): string {
  switch (role) {
    case "input":
      return "#3b82f6"; // 青
    case "output":
      return "#ef4444"; // 赤
    case "primary":
      return "#3b82f6"; // 青（正規情報）
    case "supporting":
      return "#22c55e"; // 緑（裏付け情報）
    default:
      return "#666";
  }
}

/**
 * Dagreを使用してグラフレイアウトを計算
 */
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR"
): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: direction,
    nodesep: 80,    // ノード間の垂直方向の間隔
    ranksep: 120,   // ランク（列）間の水平方向の間隔
    marginx: 50,
    marginy: 50,
  });

  // ノードをDagreグラフに追加
  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: node.width ?? MIN_NODE_WIDTH,
      height: node.height ?? NODE_HEIGHT,
    });
  });

  // エッジをDagreグラフに追加
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // レイアウトを計算
  Dagre.layout(g);

  // 計算された位置を適用
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (node.width ?? MIN_NODE_WIDTH) / 2,
        y: nodeWithPosition.y - (node.height ?? NODE_HEIGHT) / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * 機序図JSONからReact Flowのノード・エッジに変換
 */
function convertToFlowElements(diagram: KijoDiagram): {
  nodes: Node[];
  edges: Edge[];
} {
  const diagramNodes = diagram.diagram.nodes;
  const diagramEdges = diagram.diagram.edges;

  // ノードの初期変換（位置は後でDagreが決定）
  const nodes: Node[] = diagramNodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: { x: 0, y: 0 }, // 仮の位置
    data: { node },
    width: calculateNodeWidth(node),
    height: NODE_HEIGHT,
  }));

  // エッジの変換
  const edges: Edge[] = diagramEdges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: "floating",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: getEdgeColor(edge.role),
    },
    style: {
      stroke: getEdgeColor(edge.role),
      strokeWidth: 2,
    },
  }));

  // Dagreでレイアウトを計算して適用
  return getLayoutedElements(nodes, edges, "LR");
}

/**
 * グラフの整合性を検証
 */
function validateGraph(diagram: KijoDiagram): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const nodes = diagram.diagram.nodes;
  const edges = diagram.diagram.edges;

  // エッジ参照の検証
  const edgeValidation = validateEdgeReferences(nodes, edges);
  if (!edgeValidation.valid) {
    warnings.push(
      `存在しないノードへの参照があります: ${edgeValidation.invalidEdges
        .map((e) => `${e.from} → ${e.to}`)
        .join(", ")}`
    );
  }

  // 循環参照の検出
  if (detectCycle(nodes, edges)) {
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
function KijoDiagramViewerInner({ diagram, className, articleContent, articleTitle, onNavigate }: KijoDiagramViewerProps) {
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

  const [nodes, , onNodesChange] = useNodesState(initialElements.nodes);
  const [edges, , onEdgesChange] = useEdgesState(initialElements.edges);

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
          edgeTypes={edgeTypes}
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
        <NodeDetailPanel node={selectedNode} onNavigate={onNavigate} />
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
