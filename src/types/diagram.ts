/**
 * 審査機序図 型定義 (v3)
 * buildingSMART Japan 審査機序図作成手引書に基づく
 */

/** 性質の型 */
export type PropertyType =
  | "proposition" // 命題真偽
  | "classification" // 区分情報
  | "numeric" // 数値
  | "geometric_point" // 幾何学的情報: 点
  | "geometric_direction" // 幾何学的情報: 方向
  | "geometric_line" // 幾何学的情報: 線形状
  | "geometric_surface" // 幾何学的情報: 面形状
  | "geometric_solid" // 幾何学的情報: ソリッド形状
  | "set_definition" // 集合定義
  | "visual"; // 視認情報

/** 処理の種類 */
export type ProcessType =
  | "mechanical" // 機械的処理
  | "human_judgment" // 人の認識/判断を含む
  | "consistency_check" // 整合確認
  | "sub_diagram_reference" // 部分審査機序図への参照
  | "undefined_input"; // 入力情報不定処理

/** 単数/複数 */
export type Plurality = "single" | "multiple";

/** 単体/反復 */
export type Iteration = "single" | "iterative";

/** エッジの役割 */
export type EdgeRole =
  | "input" // 通常の入力
  | "output" // 出力
  | "primary" // 整合確認の正規情報
  | "supporting"; // 整合確認の裏付け情報

/** ソフトウェア機能区分 */
export type SoftwareFunctionCategory =
  | "user_input" // ユーザー入力
  | "graphic_display" // グラフィック表示
  | "text_display" // 文字表示
  | "program_processing"; // プログラム処理

/** ページタイトル */
export interface PageTitle {
  title: string;
  target_subject?: string;
  description?: string;
}

/** 法令参照 */
export interface LegalRef {
  law_id: string;
  law_type: "act" | "order" | "regulation" | "notice";
  law_name: string;
  law_abbrev: string;
  article: string;
  paragraph?: string | null;
  item?: string | null;
}

/** 関連法令 */
export interface RelatedLaw {
  law_id: string;
  law_name: string;
  law_type: "act" | "order" | "regulation" | "notice";
  relationship: "delegates_to" | "delegated_from" | "defines_detail" | "references" | "supersedes";
  articles?: string[];
  description?: string;
}

/** 適合判定ロジック */
export interface ComplianceLogic {
  scope_condition?: {
    operator: string;
    value?: boolean;
    conditions?: unknown[];
    note?: string;
  };
  judgment_rule?: {
    operator: string;
    lhs?: { var: string; desc: string; property_type?: string; unit?: string };
    rhs?: { val?: number | boolean; var?: string; desc?: string; unit?: string };
    conditions?: unknown[];
  };
  exceptions?: {
    operator: string;
    conditions?: { id: string; desc: string; related_article?: string }[];
    effect: string;
  } | null;
}

/** ソフトウェア機能 */
export interface SoftwareFunction {
  category: SoftwareFunctionCategory;
  description?: string;
}

/** 委任先法令の要件詳細 */
export interface DelegatedRequirement {
  article_ref: string;
  requirement: string;
}

/** [情報]ノード */
export interface InformationNode {
  id: string;
  type: "information";
  title: string;
  symbol?: string;
  subject?: string;
  plurality?: Plurality;
  property?: string;
  property_type?: PropertyType;
  unit?: string;
  description?: string;
  related_articles?: string[];
  delegated_requirements?: DelegatedRequirement[];
  remarks?: string;
  mvd_related?: string;
}

/** [処理]ノード */
export interface ProcessNode {
  id: string;
  type: "process";
  title: string;
  process_type: ProcessType;
  target_subject?: string;
  iteration?: Iteration;
  description?: string;
  related_articles?: string[];
  remarks?: string;
  logic_expression?: string;
  software_functions?: SoftwareFunction[];
  sub_diagram_ref?: string;
}

/** ノード (情報または処理) */
export type DiagramNode = InformationNode | ProcessNode;

/** エッジ (ノード間の接続) */
export interface Edge {
  id: string;
  from: string;
  to: string;
  role?: EdgeRole;
}

/** メタデータ */
export interface DiagramMetadata {
  created_at?: string;
  updated_at?: string;
  author?: string;
  generator?: string;
  law_id?: string;
  law_name?: string;
  checklist_ref?: string;
}

/** 審査機序図 (v3) */
export interface KijoDiagram {
  id: string;
  version: string;
  page_title: PageTitle;
  legal_ref: LegalRef;
  labels?: string[];
  text_raw?: string;
  compliance_logic?: ComplianceLogic;
  diagram: {
    nodes: DiagramNode[];
    edges: Edge[];
  };
  related_laws?: RelatedLaw[];
  metadata?: DiagramMetadata;
}

/** 型ガード: InformationNodeかどうか */
export function isInformationNode(node: DiagramNode): node is InformationNode {
  return node.type === "information";
}

/** 型ガード: ProcessNodeかどうか */
export function isProcessNode(node: DiagramNode): node is ProcessNode {
  return node.type === "process";
}

/**
 * 処理の種類に応じたHEX色を取得（外部出力・エクスポート用）
 */
export function getProcessHexColor(processType: ProcessType): string {
  switch (processType) {
    case "mechanical":
      return "#87CEEB"; // 水色
    case "human_judgment":
      return "#FFDAB9"; // 肌色
    case "consistency_check":
      return "#90EE90"; // 緑
    case "sub_diagram_reference":
      return "#D3D3D3"; // グレー
    case "undefined_input":
      return "#FFA500"; // オレンジ
    default:
      return "#FFFFFF";
  }
}

/**
 * 情報ノードのHEX色を取得（外部出力・エクスポート用）
 */
export function getInformationHexColor(propertyType?: PropertyType): string {
  return propertyType === "visual" ? "#FFDAB9" : "#FFFFFF"; // 視認情報は肌色
}

/**
 * 処理の種類に応じたTailwind CSSクラスを取得（UIコンポーネント用）
 */
export function getProcessTailwindClass(processType: ProcessType): string {
  switch (processType) {
    case "mechanical":
      return "bg-sky-100 border-sky-400"; // 水色
    case "human_judgment":
      return "bg-orange-100 border-orange-300"; // 肌色
    case "consistency_check":
      return "bg-green-100 border-green-400"; // 緑
    case "sub_diagram_reference":
      return "bg-gray-200 border-gray-400"; // グレー
    case "undefined_input":
      return "bg-orange-300 border-orange-500"; // オレンジ
    default:
      return "bg-white border-gray-400";
  }
}

/**
 * 情報ノードのTailwind CSSクラスを取得（UIコンポーネント用）
 */
export function getInformationTailwindClass(propertyType?: PropertyType): string {
  return propertyType === "visual"
    ? "bg-orange-100 border-orange-300"
    : "bg-white border-gray-400";
}
