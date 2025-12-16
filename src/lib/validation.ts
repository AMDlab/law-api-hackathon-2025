import { z } from "zod";

// ========================================
// ID バリデーション
// ========================================

/**
 * e-Gov法令ID形式のバリデーション
 * 例: 325AC0000000201（建築基準法）
 */
export function isValidLawId(id: string): boolean {
  // 英数字のみ、3〜20文字
  return /^[A-Z0-9]{3,20}$/i.test(id);
}

/**
 * 条文ID形式のバリデーション
 * 例: A43, A20_3, A43_P1, A112_P1_I2, A112_P1_flow
 */
export function isValidArticleId(id: string): boolean {
  return /^A\d+(?:_\d+)*(?:_P\d+)?(?:_I\d+)?(?:_flow)?$/.test(id);
}

// ========================================
// Zod スキーマ定義 (v3形式)
// ========================================

/** 性質の型 */
export const PropertyTypeSchema = z.enum([
  "proposition",
  "classification",
  "numeric",
  "geometric_point",
  "geometric_direction",
  "geometric_line",
  "geometric_surface",
  "geometric_solid",
  "set_definition",
  "visual",
]);

/** 処理の種類 */
export const ProcessTypeSchema = z.enum([
  "mechanical",
  "human_judgment",
  "consistency_check",
  "sub_diagram_reference",
  "undefined_input",
]);

/** 単数/複数 */
export const PluralitySchema = z.enum(["single", "multiple"]);

/** 単体/反復 */
export const IterationSchema = z.enum(["single", "iterative"]);

/** エッジの役割 */
export const EdgeRoleSchema = z.enum(["input", "output", "primary", "supporting", "yes", "no", "flow"]);

/** 端子ノードの結果 */
export const TerminalResultSchema = z.enum(["pass", "fail", "start", "end"]);

/** ソフトウェア機能区分 */
export const SoftwareFunctionCategorySchema = z.enum([
  "user_input",
  "graphic_display",
  "text_display",
  "program_processing",
]);

/** ページタイトル */
export const PageTitleSchema = z.object({
  title: z.string().min(1),
  target_subject: z.string().optional(),
  description: z.string().optional(),
});

/** 法令参照 */
export const LegalRefSchema = z.object({
  law_id: z.string().min(1),
  law_type: z.enum(["act", "order", "regulation", "notice"]),
  law_name: z.string().min(1),
  law_abbrev: z.string().min(1),
  article: z.string().min(1),
  paragraph: z.string().nullable().optional(),
  item: z.string().nullable().optional(),
});

/** 関連法令 */
export const RelatedLawSchema = z.object({
  law_id: z.string().min(1),
  law_name: z.string().min(1),
  law_type: z.enum(["act", "order", "regulation", "notice"]),
  relationship: z.enum(["delegates_to", "delegated_from", "defines_detail", "references", "supersedes"]),
  articles: z.array(z.string()).optional(),
  description: z.string().optional(),
});

/** ソフトウェア機能 */
export const SoftwareFunctionSchema = z.object({
  category: SoftwareFunctionCategorySchema,
  description: z.string().optional(),
});

/** 委任先法令の要件詳細 */
export const DelegatedRequirementSchema = z.object({
  article_ref: z.string().min(1),
  requirement: z.string().min(1),
});

/** [情報]ノード */
export const InformationNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("information"),
  title: z.string().min(1),
  symbol: z.string().regex(/^[A-Za-z][A-Za-z0-9]*$/).optional(),
  subject: z.string().optional(),
  plurality: PluralitySchema.optional(),
  property: z.string().optional(),
  property_type: PropertyTypeSchema.optional(),
  unit: z.string().optional(),
  description: z.string().optional(),
  related_articles: z.array(z.string()).optional(),
  delegated_requirements: z.array(DelegatedRequirementSchema).optional(),
  remarks: z.string().optional(),
  mvd_related: z.string().optional(),
});

/** [処理]ノード */
export const ProcessNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("process"),
  title: z.string().min(1),
  process_type: ProcessTypeSchema,
  target_subject: z.string().optional(),
  iteration: IterationSchema.optional(),
  description: z.string().optional(),
  related_articles: z.array(z.string()).optional(),
  remarks: z.string().optional(),
  logic_expression: z.string().optional(),
  software_functions: z.array(SoftwareFunctionSchema).max(3).optional(),
  sub_diagram_ref: z.string().optional(),
});

/** [判定]ノード - 条件分岐（適合判定フロー用） */
export const DecisionNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("decision"),
  title: z.string().min(1),
  description: z.string().optional(),
  condition: z.object({
    operator: z.string(),
    lhs: z.object({
      var: z.string(),
      desc: z.string(),
    }).optional(),
    // rhsは オブジェクト形式 または 配列形式（IN演算子用）を許容
    rhs: z.union([
      z.object({
        value: z.union([z.number(), z.boolean(), z.string()]).optional(),
        var: z.string().optional(),
        desc: z.string().optional(),
        unit: z.string().optional(),
      }),
      z.array(z.string()), // IN演算子用の配列
    ]).optional(),
  }).optional(),
  related_articles: z.array(z.string()).optional(),
});

/** [端子]ノード - 開始/終了/結果（適合判定フロー用） */
export const TerminalNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("terminal"),
  title: z.string().min(1),
  result: TerminalResultSchema,
  description: z.string().optional(),
  related_articles: z.array(z.string()).optional(),
});

/** ノード（情報・処理・判定・端子） */
export const DiagramNodeSchema = z.discriminatedUnion("type", [
  InformationNodeSchema,
  ProcessNodeSchema,
  DecisionNodeSchema,
  TerminalNodeSchema,
]);

/** エッジ */
export const EdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  role: EdgeRoleSchema.optional(),
  label: z.string().optional(),
});

/** メタデータ */
export const DiagramMetadataSchema = z.object({
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  author: z.string().optional(),
  generator: z.string().optional(),
  law_id: z.string().optional(),
  law_name: z.string().optional(),
  checklist_ref: z.string().optional(),
  source: z.string().optional(),
});

/** 図 */
export const DiagramSchema = z.object({
  nodes: z.array(DiagramNodeSchema).min(1),
  edges: z.array(EdgeSchema),
});

/** 適合判定条件（再帰的構造に対応） */
const BaseConditionSchema = z.object({
  id: z.string().optional(),
  var: z.string().optional(),
  desc: z.string().optional(),
  operator: z.string().optional(),
  value: z.union([z.boolean(), z.number(), z.string(), z.array(z.string())]).optional(),
  unit: z.string().optional(),
  property_type: z.string().optional(),
});

// 再帰的なconditionsを含む条件
type Condition = z.infer<typeof BaseConditionSchema> & {
  conditions?: Condition[];
};

const ConditionSchema: z.ZodType<Condition> = BaseConditionSchema.extend({
  conditions: z.lazy(() => z.array(ConditionSchema)).optional(),
});

/** 適用範囲条件 */
export const ScopeConditionSchema = z.object({
  operator: z.string(),
  value: z.boolean().optional(),
  conditions: z.array(ConditionSchema).optional(),
  note: z.string().optional(),
});

/** 判定ルールの左辺・右辺 */
const JudgmentOperandSchema = z.object({
  var: z.string().optional(),
  val: z.union([z.number(), z.boolean(), z.string()]).optional(),
  desc: z.string().optional(),
  property_type: z.string().optional(),
  unit: z.string().optional(),
});

/** 判定ルール */
export const JudgmentRuleSchema = z.object({
  operator: z.string(),
  lhs: JudgmentOperandSchema.optional(),
  rhs: JudgmentOperandSchema.optional(),
  conditions: z.array(ConditionSchema).optional(),
});

/** 例外条件 */
export const ExceptionsSchema = z.object({
  operator: z.string(),
  conditions: z.array(ConditionSchema).optional(),
  effect: z.string(),
}).nullable();

/** 適合判定ロジック */
export const ComplianceLogicSchema = z.object({
  scope_condition: ScopeConditionSchema.optional(),
  judgment_rule: JudgmentRuleSchema.optional(),
  exceptions: ExceptionsSchema.optional(),
});

/** 適合判定フロー図 */
export const FlowDiagramSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  nodes: z.array(DiagramNodeSchema).min(1),
  edges: z.array(EdgeSchema),
});

/** 審査機序図 (v3.2) - 統合形式 */
export const KijoDiagramSchema = z.object({
  id: z.string().min(1),
  version: z.string(),
  page_title: PageTitleSchema,
  legal_ref: LegalRefSchema,
  labels: z.array(z.string()).optional(),
  text_raw: z.string().optional(),
  compliance_logic: ComplianceLogicSchema.optional(),
  // 機序図（必須）
  kijo_diagram: DiagramSchema,
  // 適合判定フロー図（オプション）
  flow_diagram: FlowDiagramSchema.optional(),
  related_laws: z.array(RelatedLawSchema).optional(),
  metadata: DiagramMetadataSchema.optional(),
});

// ========================================
// バリデーション関数
// ========================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

/**
 * 機序図JSONをバリデート
 */
export function validateDiagram(data: unknown): ValidationResult<z.infer<typeof KijoDiagramSchema>> {
  const result = KijoDiagramSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * バリデーションエラーをフォーマット
 */
export function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");
}

// ========================================
// グラフ検証
// ========================================

/**
 * グラフの循環参照を検出
 * @returns 循環がある場合はtrue
 */
export function detectCycle(
  nodes: Array<{ id: string }>,
  edges: Array<{ from: string; to: string }>
): boolean {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const adjacencyList = new Map<string, string[]>();

  // 隣接リストを構築
  for (const nodeId of nodeIds) {
    adjacencyList.set(nodeId, []);
  }
  for (const edge of edges) {
    if (adjacencyList.has(edge.from)) {
      adjacencyList.get(edge.from)!.push(edge.to);
    }
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true; // 循環検出
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  // すべてのノードからDFSを開始
  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) return true;
    }
  }

  return false;
}

/**
 * エッジの整合性を検証（存在しないノードへの参照をチェック）
 */
export function validateEdgeReferences(
  nodes: Array<{ id: string }>,
  edges: Array<{ from: string; to: string }>
): { valid: boolean; invalidEdges: Array<{ from: string; to: string }> } {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const invalidEdges: Array<{ from: string; to: string }> = [];

  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      invalidEdges.push(edge);
    }
  }

  return {
    valid: invalidEdges.length === 0,
    invalidEdges,
  };
}
