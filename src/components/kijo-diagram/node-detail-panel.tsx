"use client";

import type { DiagramNode, InformationNode, ProcessNode, DelegatedRequirement } from "@/types/diagram";
import { isInformationNode, isProcessNode } from "@/types/diagram";

interface NodeDetailPanelProps {
  node: DiagramNode | null;
  onNavigate?: (lawId: string, diagramId: string) => void;
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
 * 法令ID定義
 */
const LAW_IDS: Record<string, string> = {
  "法": "325AC0000000201",
  "令": "325CO0000000338",
  "規則": "325M50004000040",
};

/**
 * 関連条項をパースしてサービス内リンク情報を生成
 * 形式: "法::A43:P1" → 建築基準法第43条第1項
 * 形式: "令::A109_9:P1:I1" → 施行令第109条の9第1項第1号
 */
function parseRelatedArticle(article: string): {
  lawName: string;
  lawId: string;
  articleNum: string;
  paragraphNum?: string;
  itemNum?: string;
  display: string;
  diagramId: string;
} | null {
  // 形式: 法令名::A条番号:P項番号:I号番号
  const match = article.match(/^([^:]+)::A([^:]+)(?::P(\d+))?(?::I(\d+))?$/);
  if (!match) return null;

  const [, lawAbbrev, articleNum, paragraphNum, itemNum] = match;
  const lawId = LAW_IDS[lawAbbrev];
  if (!lawId) return null;

  // 条番号の表示（例: 109_9 → 第109条の9）
  // 「_」は「条の」に変換
  const articleDisplay = articleNum.includes("_")
    ? articleNum.replace(/_/g, "条の")
    : articleNum + "条";

  // 表示テキスト
  let display = `${lawAbbrev}第${articleDisplay}`;
  if (paragraphNum) display += `第${paragraphNum}項`;
  if (itemNum) display += `第${itemNum}号`;

  // 機序図ID（例: A43_P1, A43_P1_I2）
  let diagramId = `A${articleNum}`;
  if (paragraphNum) diagramId += `_P${paragraphNum}`;
  if (itemNum) diagramId += `_I${itemNum}`;

  return { lawName: lawAbbrev, lawId, articleNum, paragraphNum, itemNum, display, diagramId };
}

/**
 * 関連条項のリンクリスト
 */
function RelatedArticlesLinks({
  articles,
  onNavigate,
}: {
  articles: string[];
  onNavigate?: (lawId: string, diagramId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {articles.map((article, i) => {
        const parsed = parseRelatedArticle(article);
        if (parsed) {
          if (onNavigate) {
            return (
              <button
                key={i}
                onClick={() => onNavigate(parsed.lawId, parsed.diagramId)}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                {parsed.display}
              </button>
            );
          }
          // onNavigateがない場合はURLパラメータ付きリンク
          const url = `/?lawId=${parsed.lawId}&diagramId=${parsed.diagramId}`;
          return (
            <a
              key={i}
              href={url}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              {parsed.display}
            </a>
          );
        }
        // パースできない場合はそのまま表示
        return <span key={i} className="text-sm">{article}</span>;
      })}
    </div>
  );
}

/**
 * 委任先法令の要件詳細表示
 */
function DelegatedRequirementsList({
  requirements,
  onNavigate,
}: {
  requirements: DelegatedRequirement[];
  onNavigate?: (lawId: string, diagramId: string) => void;
}) {
  return (
    <div className="space-y-2">
      {requirements.map((req, i) => {
        const parsed = parseRelatedArticle(req.article_ref);
        return (
          <div key={i} className="bg-gray-50 p-2 rounded text-sm">
            <div className="font-medium text-gray-700 mb-1">
              {parsed ? (
                onNavigate ? (
                  <button
                    onClick={() => onNavigate(parsed.lawId, parsed.diagramId)}
                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    {parsed.display}
                  </button>
                ) : (
                  <a
                    href={`/?lawId=${parsed.lawId}&diagramId=${parsed.diagramId}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {parsed.display}
                  </a>
                )
              ) : (
                <span>{req.article_ref}</span>
              )}
            </div>
            <div className="text-gray-600">{req.requirement}</div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * [情報]ノードの詳細表示
 */
function InformationDetail({
  node,
  onNavigate,
}: {
  node: InformationNode;
  onNavigate?: (lawId: string, diagramId: string) => void;
}) {
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
          {node.property_type ? getPropertyTypeLabel(node.property_type) : "-"}
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500">説明</div>
        <div className="text-sm">{node.description || "-"}</div>
      </div>
      {node.related_articles && node.related_articles.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">関連条項</div>
          <RelatedArticlesLinks articles={node.related_articles} onNavigate={onNavigate} />
        </div>
      )}
      {node.delegated_requirements && node.delegated_requirements.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">委任先法令の要件</div>
          <DelegatedRequirementsList requirements={node.delegated_requirements} onNavigate={onNavigate} />
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
function ProcessDetail({
  node,
  onNavigate,
}: {
  node: ProcessNode;
  onNavigate?: (lawId: string, diagramId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs text-gray-500">処理の種類</div>
        <div className="text-sm">{getProcessTypeLabel(node.process_type)}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">対象主体</div>
        <div className="text-sm">{node.target_subject || "-"}</div>
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
      {node.logic_expression && (
        <div>
          <div className="text-xs text-gray-500">論理式等</div>
          <div className="text-sm font-mono bg-gray-100 p-2 rounded">
            {node.logic_expression}
          </div>
        </div>
      )}
      {node.related_articles && node.related_articles.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">関連条項</div>
          <RelatedArticlesLinks articles={node.related_articles} onNavigate={onNavigate} />
        </div>
      )}
      {node.software_functions && node.software_functions.length > 0 && (
        <div>
          <div className="text-xs text-gray-500">ソフトウェア機能</div>
          <ul className="text-sm list-disc list-inside">
            {node.software_functions.map((func, i) => (
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
export function NodeDetailPanel({ node, onNavigate }: NodeDetailPanelProps) {
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
      {isInformationNode(node) && <InformationDetail node={node} onNavigate={onNavigate} />}
      {isProcessNode(node) && <ProcessDetail node={node} onNavigate={onNavigate} />}
    </div>
  );
}
