"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
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
import { FlowDecisionNode } from "./flow-decision-node";
import { FlowTerminalNode } from "./flow-terminal-node";
import { NodeDetailPanel } from "./node-detail-panel";
import { ExportButton } from "./export-button";
import { HelpButton } from "./help-button";
import { FloatingEdge } from "./floating-edge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 機序図用カスタムノードタイプ
const kijoNodeTypes = {
  information: InformationNode,
  process: ProcessNode,
  decision: FlowDecisionNode,
  terminal: FlowTerminalNode,
};

// フロー図用カスタムノードタイプ（シンプル版）
const flowNodeTypes = {
  information: InformationNode,
  process: ProcessNode,
  decision: FlowDecisionNode,
  terminal: FlowTerminalNode,
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
const NODE_HEIGHT = 50;
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
    case "yes":
      return "#10b981"; // 緑（Yes）
    case "no":
      return "#ef4444"; // 赤（No）
    case "flow":
      return "#6b7280"; // グレー（フロー）
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
    nodesep: direction === "TB" ? 60 : 80,
    ranksep: direction === "TB" ? 80 : 120,
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
 * 図のノード・エッジ構造
 */
interface DiagramStructureLocal {
  nodes: DiagramNode[];
  edges: import("@/types/diagram").Edge[];
}

/**
 * 機序図JSONからReact Flowのノード・エッジに変換
 */
function convertToFlowElements(
  diagramStructure: DiagramStructureLocal,
  isFlowDiagram: boolean = false
): {
  nodes: Node[];
  edges: Edge[];
} {
  const diagramNodes = diagramStructure.nodes;
  const diagramEdges = diagramStructure.edges;

  // ノードの初期変換（位置は後でDagreが決定）
  const nodes: Node[] = diagramNodes.map((node) => {
    // フロー図のdecisionノードはダイアモンド形（80x80）
    const isDecisionInFlow = isFlowDiagram && node.type === "decision";
    return {
      id: node.id,
      type: node.type,
      position: { x: 0, y: 0 }, // 仮の位置
      data: { node, isFlowDiagram },
      width: isDecisionInFlow ? 120 : calculateNodeWidth(node),
      height: isDecisionInFlow ? 50 : NODE_HEIGHT,
    };
  });

  // エッジの変換
  // フロー図の場合はグレーで統一
  const flowEdgeColor = "#6b7280";
  
  const edges: Edge[] = diagramEdges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: "floating",
    label: edge.label || (edge.role === "yes" ? "はい" : edge.role === "no" ? "いいえ" : undefined),
    labelStyle: { fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: "#fff", fillOpacity: 0.9 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: isFlowDiagram ? flowEdgeColor : getEdgeColor(edge.role),
    },
    style: {
      stroke: isFlowDiagram ? flowEdgeColor : getEdgeColor(edge.role),
      strokeWidth: 2,
    },
  }));

  // レイアウト方向: 機序図はLR、フロー図はTB
  const direction = isFlowDiagram ? "TB" : "LR";
  return getLayoutedElements(nodes, edges, direction);
}

/**
 * グラフの整合性を検証
 */
function validateGraph(diagramStructure: DiagramStructureLocal): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const nodes = diagramStructure.nodes;
  const edges = diagramStructure.edges;

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
  const [activeTab, setActiveTab] = useState<"kijo" | "flow">("kijo");
  const flowRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  // 統合されたJSONからflow_diagramを取得
  const hasFlowDiagram = diagram.flow_diagram !== undefined;
  
  // 現在表示中の図のノード・エッジを取得
  const isFlowDiagram = activeTab === "flow" && hasFlowDiagram;
  
  // 表示用のダイアグラム構造を取得（メモ化して無限ループを防止）
  const currentDiagramStructure = useMemo(() => {
    if (isFlowDiagram && diagram.flow_diagram) {
      return { nodes: diagram.flow_diagram.nodes, edges: diagram.flow_diagram.edges };
    }
    return diagram.diagram;
  }, [isFlowDiagram, diagram.flow_diagram, diagram.diagram]);

  // グラフの検証
  const validation = useMemo(() => validateGraph(currentDiagramStructure), [currentDiagramStructure]);

  // 初期ノード・エッジを計算
  const initialElements = useMemo(
    () => convertToFlowElements(currentDiagramStructure, isFlowDiagram),
    [currentDiagramStructure, isFlowDiagram]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialElements.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialElements.edges);

  // タブ切り替え時にノード・エッジを更新
  useEffect(() => {
    const elements = convertToFlowElements(currentDiagramStructure, isFlowDiagram);
    setNodes(elements.nodes);
    setEdges(elements.edges);
    setSelectedNode(null);
    // 少し遅延させてfitViewを実行
    setTimeout(() => {
      fitView({ padding: 0.2 });
    }, 50);
  }, [currentDiagramStructure, isFlowDiagram, setNodes, setEdges, fitView]);

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

  // 使用するノードタイプ
  const nodeTypes = isFlowDiagram ? flowNodeTypes : kijoNodeTypes;

  return (
    <div className={`flex h-full ${className || ""}`}>
      {/* メイン図 */}
      <div className="flex-1 h-full relative" ref={flowRef}>
        {/* 左上のタブ切り替え（フロー図がある場合のみ表示） */}
        {hasFlowDiagram && (
          <div className="absolute top-2 left-2 z-10">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "kijo" | "flow")}>
              <TabsList className="h-8">
                <TabsTrigger value="kijo" className="text-xs px-3 h-7">
                  機序図
                </TabsTrigger>
                <TabsTrigger value="flow" className="text-xs px-3 h-7">
                  適合判定フロー図
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
        {/* 右上のボタン */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
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
