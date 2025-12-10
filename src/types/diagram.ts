/**
 * 審査機序図 型定義
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
  /** 図形上に表示するタイトル */
  title: string;
  /** ページ全体が対象とする主体 */
  targetSubject?: string;
  /** ページ全体の処理内容 */
  description?: string;
  /** 関連条項 (例: "法::A43:P1") */
  relatedArticles?: string[];
}

/** [情報]ノード */
export interface InformationNode {
  /** ノードの一意識別子 */
  id: string;
  /** ノードタイプ */
  type: "information";
  /** 図形上に表示するタイトル */
  title: string;
  /** 論理式等で用いる記号 (例: A, B, X1) */
  symbol?: string;
  /** 情報を保持する主体 (例: 建築物, 室, 敷地) */
  subject?: string;
  /** 単数か複数か */
  plurality?: Plurality;
  /** 主体がもつ性質 */
  property?: string;
  /** 性質の型 */
  propertyType?: PropertyType;
  /** 情報内容の説明 */
  description?: string;
  /** 関連法令条項 */
  relatedArticles?: string[];
  /** 備考 */
  remarks?: string;
  /** IFC適用クラスやPropertySet情報 */
  mvdRelated?: string;
}

/** ソフトウェア機能 */
export interface SoftwareFunction {
  /** 機能区分 */
  category: SoftwareFunctionCategory;
  /** 機能概要 */
  description?: string;
}

/** [処理]ノード */
export interface ProcessNode {
  /** ノードの一意識別子 */
  id: string;
  /** ノードタイプ */
  type: "process";
  /** 図形上に表示するタイトル */
  title: string;
  /** 処理の種類 */
  processType: ProcessType;
  /** 処理対象となる主体の型 */
  targetSubject?: string;
  /** 単体処理か反復処理か */
  iteration?: Iteration;
  /** 処理の概要説明 */
  description?: string;
  /** 関連法令条項 */
  relatedArticles?: string[];
  /** 備考 */
  remarks?: string;
  /** 論理式等 (入力情報の記号を用いた処理内容の表現) */
  logicExpression?: string;
  /** ソフトウェア機能 (最大3つ) */
  softwareFunctions?: SoftwareFunction[];
  /** 参照する部分審査機序図のID */
  subDiagramRef?: string;
}

/** ノード (情報または処理) */
export type DiagramNode = InformationNode | ProcessNode;

/** エッジ (ノード間の接続) */
export interface Edge {
  /** エッジの一意識別子 */
  id: string;
  /** 始点ノードのID */
  from: string;
  /** 終点ノードのID */
  to: string;
  /** エッジの役割 */
  role?: EdgeRole;
}

/** メタデータ */
export interface DiagramMetadata {
  /** 作成日時 */
  createdAt?: string;
  /** 更新日時 */
  updatedAt?: string;
  /** 作成者 */
  author?: string;
  /** 生成ツール (例: law-mcp-v1.0) */
  generator?: string;
  /** 対象法令ID (e-Gov法令API準拠) */
  lawId?: string;
  /** 対象法令名 */
  lawName?: string;
}

/** 審査機序図 */
export interface KijoDiagram {
  /** 機序図の一意識別子 */
  id: string;
  /** スキーマバージョン */
  version?: string;
  /** ページタイトル */
  pageTitle: PageTitle;
  /** ノード一覧 */
  nodes: DiagramNode[];
  /** エッジ一覧 */
  edges: Edge[];
  /** メタデータ */
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