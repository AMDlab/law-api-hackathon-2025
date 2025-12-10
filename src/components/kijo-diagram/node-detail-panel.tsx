"use client";

import type { DiagramNode, InformationNode, ProcessNode } from "@/types/diagram";
import { isInformationNode, isProcessNode } from "@/types/diagram";

interface NodeDetailPanelProps {
  node: DiagramNode | null;
}

/**
 * 性質の型を日本語で表示
 */
function getPropertyTypeLabel(propertyType: string): string {
  const labels: Record<string, string> = {
    proposition: "命題真偽",
    classification: "区分情報",
    numeric: "数値",
    geometric_point: "点",
    geometric_direction: "方向",
    geometric_line: "線形状",
    geometric_surface: "面形状",
    geometric_solid: "立体形状",
    set_definition: "集合定義",
    visual: "視認情報",
  };
  return labels[propertyType] || propertyType;
}

/**
 * 処理の種類を日本語で表示
 */
function getProcessTypeLabel(processType: string): string {
  const labels: Record<string, string> = {
    mechanical: "機械的処理",
    human_judgment: "人の認識/判断を含む",
    consistency_check: "整合確認",
    sub_diagram_reference: "部分審査機序図への参照",
    undefined_input: "入力情報不定処理",
  };
  return labels[processType] || processType;
}

/**
 * [情報]ノードの詳細表示
 */
function InformationDetail({ node }: { node: InformationNode }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-gray-500">主体</div>
        <div className="text-sm">{node.subject || "-"}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">性質</div>
        <div className="text-sm">{node.property || "-"}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">性質の型</div>
        <div className="text-sm">
          {node.propertyType ? getPropertyTypeLabel(node.propertyType) : "-"}
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500">説明</div>
        <div className="text-sm">{node.description || "-"}</div>
      </div>
      {node.relatedArticles && node.relatedArticles.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">関連条項</div>
          <div className="text-sm">{node.relatedArticles.join(", ")}</div>
        </div>
      )}
      {node.remarks && (
        <div>
          <div className="text-xs text-gray-500">備考</div>
          <div className="text-sm">{node.remarks}</div>
        </div>
      )}
    </div>
  );
}

/**
 * [処理]ノードの詳細表示
 */
function ProcessDetail({ node }: { node: ProcessNode }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-gray-500">処理の種類</div>
        <div className="text-sm">{getProcessTypeLabel(node.processType)}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">対象主体</div>
        <div className="text-sm">{node.targetSubject || "-"}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">単体/反復</div>
        <div className="text-sm">
          {node.iteration === "iterative" ? "反復処理" : "単体処理"}
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500">説明</div>
        <div className="text-sm">{node.description || "-"}</div>
      </div>
      {node.logicExpression && (
        <div>
          <div className="text-xs text-gray-500">論理式等</div>
          <div className="text-sm font-mono bg-gray-100 p-2 rounded">
            {node.logicExpression}
          </div>
        </div>
      )}
      {node.relatedArticles && node.relatedArticles.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">関連条項</div>
          <div className="text-sm">{node.relatedArticles.join(", ")}</div>
        </div>
      )}
      {node.softwareFunctions && node.softwareFunctions.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">ソフトウェア機能</div>
          <ul className="text-sm list-disc list-inside">
            {node.softwareFunctions.map((func, i) => (
              <li key={i}>
                {func.category}: {func.description || "-"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * ノード詳細パネル
 */
export function NodeDetailPanel({ node }: NodeDetailPanelProps) {
  if (!node) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        ノードを選択すると詳細が表示されます
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* ヘッダー */}
      <div className="mb-4 pb-2 border-b">
        <div className="text-xs text-gray-500">
          {isInformationNode(node) ? "[情報]" : "[処理]"}
        </div>
        <div className="font-bold text-lg">{node.title}</div>
        {isInformationNode(node) && node.symbol && (
          <div className="text-sm text-blue-600">記号: {node.symbol}</div>
        )}
      </div>

      {/* 詳細 */}
      {isInformationNode(node) && <InformationDetail node={node} />}
      {isProcessNode(node) && <ProcessDetail node={node} />}
    </div>
  );
}
