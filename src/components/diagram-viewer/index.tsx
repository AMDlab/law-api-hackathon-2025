"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  type Connection,
  addEdge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "@dagrejs/dagre";

import type {
  KijoDiagram,
  FlowDiagram,
  DiagramNode,
  EdgeRole,
} from "@/types/diagram";
import { detectCycle, validateEdgeReferences } from "@/lib/validation";
import { InformationNode } from "./information-node";
import { ProcessNode } from "./process-node";
import { FlowDecisionNode } from "./flow-decision-node";
import { FlowTerminalNode } from "./flow-terminal-node";
import { DiagramInspector } from "./diagram-inspector";
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
  /** 分離形式のフロー図（別ファイルで提供される場合） */
  flowDiagram?: FlowDiagram;
  className?: string;
  articleContent?: string;
  articleTitle?: string;
  kijoPath?: string;
  flowPath?: string;
  onReload?: () => void | Promise<void>;
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
    case "option":
      return "#8b5cf6"; // 紫（Option）
    case "flow":
      return "#6b7280"; // グレー（フロー）
    default:
      return "#666";
  }
}

function createFlowEdge(
  edge: {
    id: string;
    from: string;
    to: string;
    role?: string;
    label?: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  },
  isFlowDiagram: boolean,
): Edge {
  const flowEdgeColor = "#6b7280";
  const label =
    edge.label ||
    (edge.role === "yes" ? "はい" : edge.role === "no" ? "いいえ" : undefined);
  return {
    id: edge.id,
    source: edge.from,
    target: edge.to,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    type: "floating",
    reconnectable: false,
    selectable: true,
    focusable: true,
    zIndex: 0,
    label,
    data: { role: edge.role, label: edge.label },
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
      cursor: "pointer",
    },
  };
}

/**
 * Dagreを使用してグラフレイアウトを計算
 */
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR",
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

function buildDiagramStructureFromState(
  nodes: Node[],
  edges: Edge[],
): DiagramStructureLocal {
  const diagramNodes: DiagramNode[] = nodes
    .map((node) => (node.data as { node?: DiagramNode } | undefined)?.node)
    .filter((node): node is DiagramNode => Boolean(node));

  const diagramEdges: import("@/types/diagram").Edge[] = edges.map((edge) => ({
    id: edge.id,
    from: edge.source,
    to: edge.target,
    role: (edge.data as { role?: EdgeRole } | undefined)?.role,
    label:
      (edge.data as { label?: string } | undefined)?.label ??
      (typeof edge.label === "string" ? edge.label : undefined),
  }));

  return { nodes: diagramNodes, edges: diagramEdges };
}

/**
 * 機序図JSONからReact Flowのノード・エッジに変換
 */
function convertToFlowElements(
  diagramStructure: DiagramStructureLocal,
  isFlowDiagram: boolean = false,
): {
  nodes: Node[];
  edges: Edge[];
} {
  const diagramNodes = diagramStructure.nodes;
  const diagramEdges = diagramStructure.edges;

  // ノードの初期変換（位置は後でDagreが決定）
  const nodes: Node[] = diagramNodes.map((node) => {
    // フロー図のdecisionノードはタイトルの長さに応じた幅
    const isDecisionInFlow = isFlowDiagram && node.type === "decision";
    const nodeWidth = calculateNodeWidth(node);
    // フロー図のdecisionは最低180px、それ以外は計算値
    const finalWidth = isDecisionInFlow ? Math.max(180, nodeWidth) : nodeWidth;
    return {
      id: node.id,
      type: node.type,
      position: { x: 0, y: 0 }, // 仮の位置
      data: {
        node,
        isFlowDiagram,
        nodeWidth: finalWidth,
        isEdgeSelected: false,
        hasOutgoing: diagramEdges.some((edge) => edge.from === node.id),
      },
      width: finalWidth,
      height: isDecisionInFlow ? 50 : NODE_HEIGHT,
    };
  });

  // エッジの変換
  const edges: Edge[] = diagramEdges.map((edge) =>
    createFlowEdge(
      {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        role: edge.role,
        label: edge.label,
      },
      isFlowDiagram,
    ),
  );

  // レイアウト方向: 機序図はLR、フロー図はTB
  const direction = isFlowDiagram ? "TB" : "LR";
  return getLayoutedElements(nodes, edges, direction);
}

/**
 * グラフの整合性を検証
 * @param isFlowDiagram フロー図の場合はtrue（フロー図ではループが許可される）
 */
function validateGraph(
  diagramStructure: DiagramStructureLocal,
  isFlowDiagram: boolean = false,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const nodes = diagramStructure.nodes;
  const edges = diagramStructure.edges;

  // エッジ参照の検証
  const edgeValidation = validateEdgeReferences(nodes, edges);
  if (!edgeValidation.valid) {
    warnings.push(
      `存在しないノードへの参照があります: ${edgeValidation.invalidEdges
        .map((e) => `${e.from} → ${e.to}`)
        .join(", ")}`,
    );
  }

  // 循環参照の検出（フロー図ではループが許可されるためスキップ）
  if (!isFlowDiagram && detectCycle(nodes, edges)) {
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
function KijoDiagramViewerInner({
  diagram,
  flowDiagram,
  className,
  articleContent,
  articleTitle,
  kijoPath,
  flowPath,
  onReload,
}: KijoDiagramViewerProps) {
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<
    import("@/types/diagram").Edge | null
  >(null);
  const [activeTab, setActiveTab] = useState<"kijo" | "flow">("kijo");
  const [isEdgeSelected, setIsEdgeSelected] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<
    Array<{ id: string; createdAt: string; note?: string | null }>
  >([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>("");
  const [actionContainer, setActionContainer] = useState<HTMLElement | null>(
    null,
  );
  const flowRef = useRef<HTMLDivElement>(null);
  const { fitView, screenToFlowPosition } = useReactFlow();

  // フロー図の有無を判定（統合形式または分離形式）
  const hasFlowDiagram =
    diagram.flow_diagram !== undefined || flowDiagram !== undefined;

  // 現在表示中の図のノード・エッジを取得
  const isFlowDiagram = activeTab === "flow" && hasFlowDiagram;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const currentDiagramStructure = useMemo(() => {
    if (isFlowDiagram) {
      if (flowDiagram?.flow_diagram) {
        return {
          nodes: flowDiagram.flow_diagram.nodes,
          edges: flowDiagram.flow_diagram.edges,
        };
      }
      if (diagram.flow_diagram) {
        return {
          nodes: diagram.flow_diagram.nodes,
          edges: diagram.flow_diagram.edges,
        };
      }
    }
    return diagram.kijo_diagram;
  }, [diagram, flowDiagram, isFlowDiagram]);

  // グラフの検証（フロー図ではループが許可される）
  const validation = useMemo(
    () =>
      validateGraph(
        buildDiagramStructureFromState(nodes, edges),
        isFlowDiagram,
      ),
    [nodes, edges, isFlowDiagram],
  );

  // タブ切り替え/データ更新時にノード・エッジを初期化
  useEffect(() => {
    const elements = convertToFlowElements(
      currentDiagramStructure,
      isFlowDiagram,
    );
    setNodes(elements.nodes);
    setEdges(elements.edges);
    setSelectedNode(null);
    setSelectedEdge(null);
    setIsEdgeSelected(false);
    setIsDirty(false);
    // 少し遅延させてfitViewを実行
    setTimeout(() => {
      fitView({ padding: 0.2 });
    }, 50);
  }, [currentDiagramStructure, isFlowDiagram, setNodes, setEdges, fitView]);

  useEffect(() => {
    setNodes((prev) => {
      let didChange = false;
      const nextNodes = prev.map((node) => {
        const data = node.data as
          | { isEdgeSelected?: boolean; hasOutgoing?: boolean }
          | undefined;
        const hasOutgoing = edges.some((edge) => edge.source === node.id);
        if (
          data?.isEdgeSelected === isEdgeSelected &&
          data?.hasOutgoing === hasOutgoing
        ) {
          return node;
        }
        didChange = true;
        return {
          ...node,
          data: {
            ...(node.data as Record<string, unknown>),
            isEdgeSelected,
            hasOutgoing,
          },
        };
      });
      return didChange ? nextNodes : prev;
    });
  }, [edges, isEdgeSelected, setNodes]);

  // 選択変更時のハンドラ
  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      if (selectedNodes.length > 0) {
        const nodeData = selectedNodes[0].data as { node: DiagramNode };
        setSelectedNode(nodeData.node);
        setSelectedEdge(null);
        setIsEdgeSelected(false);
        setEdges((prev) =>
          prev.map((edge) => ({ ...edge, reconnectable: false })),
        );
        return;
      }
      if (selectedEdges.length > 0) {
        const selected = selectedEdges[0];
        setSelectedEdge({
          id: selected.id,
          from: selected.source,
          to: selected.target,
          role: (selected.data as { role?: EdgeRole } | undefined)?.role,
          label:
            (selected.data as { label?: string } | undefined)?.label ??
            (typeof selected.label === "string" ? selected.label : undefined),
        });
        setSelectedNode(null);
        setIsEdgeSelected(true);
        setEdges((prev) =>
          prev.map((edge) => ({
            ...edge,
            reconnectable: edge.id === selected.id,
          })),
        );
        return;
      }
      setSelectedNode(null);
      setSelectedEdge(null);
      setIsEdgeSelected(false);
      setEdges((prev) =>
        prev.map((edge) => ({ ...edge, reconnectable: false })),
      );
    },
    [setEdges, setSelectedEdge, setSelectedNode, setIsEdgeSelected],
  );

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      if (changes.length > 0) {
        setIsDirty(true);
      }
    },
    [onNodesChange],
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      if (changes.length > 0) {
        setIsDirty(true);
      }
    },
    [onEdgesChange],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const newEdge = createFlowEdge(
        {
          id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          from: connection.source,
          to: connection.target,
          role: isFlowDiagram ? "flow" : "input",
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        },
        isFlowDiagram,
      );
      setEdges((eds) => addEdge(newEdge, eds));
      setIsDirty(true);
    },
    [isFlowDiagram, setEdges],
  );

  const handleReconnect = useCallback(
    (oldEdge: Edge, connection: Connection) => {
      if (!connection.source || !connection.target) return;
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id !== oldEdge.id) return edge;
          return createFlowEdge(
            {
              id: edge.id,
              from: connection.source!,
              to: connection.target!,
              role: (edge.data as { role?: string } | undefined)?.role,
              label:
                (edge.data as { label?: string } | undefined)?.label ??
                (typeof edge.label === "string" ? edge.label : undefined),
              sourceHandle: connection.sourceHandle,
              targetHandle: connection.targetHandle,
            },
            isFlowDiagram,
          );
        }),
      );
      setIsDirty(true);
    },
    [isFlowDiagram, setEdges],
  );

  // fitViewをトリガーする関数
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  const handleNodeChange = useCallback(
    (nodeId: string, updates: Partial<DiagramNode>) => {
      setNodes((prev) =>
        prev.map((node) => {
          if (node.id !== nodeId) return node;
          const current = (node.data as { node: DiagramNode }).node;
          const next = { ...current, ...updates };
          return {
            ...node,
            data: { ...(node.data as Record<string, unknown>), node: next },
          };
        }),
      );
      setSelectedNode((prev) =>
        prev?.id === nodeId ? ({ ...prev, ...updates } as DiagramNode) : prev,
      );
      setIsDirty(true);
    },
    [setNodes],
  );

  const handleEdgeChange = useCallback(
    (edgeId: string, updates: Partial<import("@/types/diagram").Edge>) => {
      setEdges((prev) =>
        prev.map((edge) => {
          if (edge.id !== edgeId) return edge;
          const nextRole =
            updates.role ?? (edge.data as { role?: string } | undefined)?.role;
          const nextLabel =
            updates.label ??
            (edge.data as { label?: string } | undefined)?.label;
          const next = createFlowEdge(
            {
              id: edge.id,
              from: updates.from ?? edge.source,
              to: updates.to ?? edge.target,
              role: nextRole,
              label: nextLabel,
              sourceHandle: edge.sourceHandle,
              targetHandle: edge.targetHandle,
            },
            isFlowDiagram,
          );
          return {
            ...next,
            selected: edge.selected,
          };
        }),
      );
      setSelectedEdge((prev) =>
        prev?.id === edgeId ? { ...prev, ...updates } : prev,
      );
      setIsDirty(true);
    },
    [isFlowDiagram, setEdges],
  );

  const handleAddNode = useCallback(
    (type: DiagramNode["type"]) => {
      const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newNode: DiagramNode = {
        id,
        type,
        title: "新規ノード",
        ...(type === "process" ? { process_type: "mechanical" } : {}),
        ...(type === "decision" ? { decision_type: "binary" } : {}),
        ...(type === "terminal" ? { result: "pass" } : {}),
      } as DiagramNode;

      const container = flowRef.current;
      const position = container
        ? (() => {
            const rect = container.getBoundingClientRect();
            return screenToFlowPosition({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            });
          })()
        : screenToFlowPosition({ x: 200, y: 200 });
      const nodeWidth = calculateNodeWidth(newNode);
      const isDecisionInFlow = isFlowDiagram && newNode.type === "decision";
      const finalWidth = isDecisionInFlow
        ? Math.max(180, nodeWidth)
        : nodeWidth;

      setNodes((prev) => [
        ...prev,
        {
          id: newNode.id,
          type: newNode.type,
          position,
          data: {
            node: newNode,
            isFlowDiagram,
            nodeWidth: finalWidth,
            isEdgeSelected,
            hasOutgoing: false,
          },
          width: finalWidth,
          height: isDecisionInFlow ? 50 : NODE_HEIGHT,
        },
      ]);
      setIsDirty(true);
    },
    [isEdgeSelected, isFlowDiagram, screenToFlowPosition, setNodes],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((node) => node.id !== nodeId));
      setEdges((prev) =>
        prev.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
      setSelectedNode(null);
      setIsDirty(true);
    },
    [setEdges, setNodes],
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((prev) => prev.filter((edge) => edge.id !== edgeId));
      setSelectedEdge(null);
      setIsDirty(true);
    },
    [setEdges],
  );

  const activePath = isFlowDiagram ? flowPath : kijoPath;

  const refreshSnapshots = useCallback(async () => {
    if (!activePath) {
      setSnapshots([]);
      return;
    }
    try {
      const res = await fetch(`${activePath}/snapshots`);
      if (!res.ok) return;
      const data = await res.json();
      setSnapshots(data.snapshots ?? []);
    } catch {
      setSnapshots([]);
    }
  }, [activePath]);

  useEffect(() => {
    refreshSnapshots();
    setSelectedSnapshotId("");
  }, [refreshSnapshots]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const container = document.getElementById("diagram-card-actions");
    setActionContainer(container);
  }, []);

  const buildPayloadForSave = useCallback(() => {
    const structure = buildDiagramStructureFromState(nodes, edges);
    if (isFlowDiagram) {
      if (!flowDiagram?.flow_diagram) {
        return null;
      }
      return {
        ...flowDiagram,
        flow_diagram: {
          ...flowDiagram.flow_diagram,
          nodes: structure.nodes,
          edges: structure.edges,
        },
      };
    }
    return {
      ...diagram,
      kijo_diagram: {
        ...diagram.kijo_diagram,
        nodes: structure.nodes,
        edges: structure.edges,
      },
    };
  }, [diagram, edges, flowDiagram, isFlowDiagram, nodes]);

  const handleSave = useCallback(async () => {
    if (!activePath) {
      setSaveError("保存先が見つかりません");
      return;
    }
    const payload = buildPayloadForSave();
    if (!payload) {
      setSaveError("フロー図の保存データがありません");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(activePath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagram: payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "保存に失敗しました");
      }
      setIsDirty(false);
      await refreshSnapshots();
      if (onReload) {
        await onReload();
      }
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "保存に失敗しました",
      );
    } finally {
      setSaving(false);
    }
  }, [activePath, buildPayloadForSave, onReload, refreshSnapshots]);

  const handleRestore = useCallback(async () => {
    if (!activePath || !selectedSnapshotId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${activePath}/snapshots/${selectedSnapshotId}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "復元に失敗しました");
      }
      await refreshSnapshots();
      if (onReload) {
        await onReload();
      }
      setIsDirty(false);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "復元に失敗しました",
      );
    } finally {
      setSaving(false);
    }
  }, [activePath, onReload, refreshSnapshots, selectedSnapshotId]);

  // 使用するノードタイプ
  const nodeTypes = isFlowDiagram ? flowNodeTypes : kijoNodeTypes;

  return (
    <div className={`flex h-full ${className || ""}`}>
      {/* メイン図 */}
      <div className="flex-1 h-full relative" ref={flowRef}>
        {/* 左上のタブ切り替え（フロー図がある場合のみ表示） */}
        {hasFlowDiagram && (
          <div className="absolute top-2 left-2 z-10">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "kijo" | "flow")}
            >
              <TabsList className="h-8">
                <TabsTrigger value="kijo" className="text-xs px-3 h-7">
                  機能構造
                </TabsTrigger>
                <TabsTrigger value="flow" className="text-xs px-3 h-7">
                  判定フロー
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
        {/* 右上のボタン */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-sm"
                variant="secondary"
                aria-label="ノード追加"
              >
                <Plus />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleAddNode("information")}>
                情報ノード
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNode("process")}>
                処理ノード
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNode("decision")}>
                判定ノード
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNode("terminal")}>
                端子ノード
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <HelpButton />
          <ExportButton
            diagram={diagram}
            flowDiagram={flowDiagram}
            isFlowMode={isFlowDiagram}
            articleContent={articleContent}
            articleTitle={articleTitle}
            flowRef={flowRef}
            onFitView={handleFitView}
          />
        </div>
        {actionContainer &&
          createPortal(
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className={`text-sm px-3 py-1.5 rounded ${
                  isDirty
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {saving ? "保存中..." : "保存"}
              </button>
              <select
                value={selectedSnapshotId}
                onChange={(e) => setSelectedSnapshotId(e.target.value)}
                className="text-sm border rounded px-3 py-1.5"
              >
                <option value="">変更履歴を選択</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {new Date(snapshot.createdAt).toLocaleString()}{" "}
                  </option>
                ))}
              </select>
              <button
                onClick={handleRestore}
                disabled={!selectedSnapshotId || saving}
                className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              >
                復元
              </button>
            </div>,
            actionContainer,
          )}
        {/* 警告表示 */}
        {!validation.valid && (
          <div className="absolute top-2 left-2 z-10 bg-yellow-50 border border-yellow-300 rounded-md p-3 max-w-md shadow-sm">
            <div className="font-medium text-yellow-800 text-sm mb-1">
              ⚠️ グラフ検証警告
            </div>
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
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onSelectionChange={onSelectionChange}
          onConnect={handleConnect}
          onReconnect={handleReconnect}
          edgesReconnectable={false}
          elementsSelectable
          edgesFocusable
          elevateEdgesOnSelect
          reconnectRadius={5}
          defaultEdgeOptions={{ reconnectable: false }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
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
        <DiagramInspector
          node={selectedNode}
          edge={selectedEdge}
          onNodeChange={handleNodeChange}
          onNodeDelete={handleDeleteNode}
          onEdgeChange={handleEdgeChange}
          onEdgeDelete={handleDeleteEdge}
        />
        {saveError && (
          <div className="px-4 pb-4 text-xs text-red-600">{saveError}</div>
        )}
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
