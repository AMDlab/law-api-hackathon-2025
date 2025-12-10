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
 * 例: A43, A20_3, A43_P1, A112_P1_I2
 */
export function isValidArticleId(id: string): boolean {
  return /^A\d+(?:_\d+)*(?:_P\d+)?(?:_I\d+)?$/.test(id);
}

// ========================================
// Zod スキーマ定義
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
export const EdgeRoleSchema = z.enum(["input", "output", "primary", "supporting"]);

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
  targetSubject: z.string().optional(),
  description: z.string().optional(),
  relatedArticles: z.array(z.string()).optional(),
});

/** ソフトウェア機能 */
export const SoftwareFunctionSchema = z.object({
  category: SoftwareFunctionCategorySchema,
  description: z.string().optional(),
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
  propertyType: PropertyTypeSchema.optional(),
  description: z.string().optional(),
  relatedArticles: z.array(z.string()).optional(),
  remarks: z.string().optional(),
  mvdRelated: z.string().optional(),
});

/** [処理]ノード */
export const ProcessNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("process"),
  title: z.string().min(1),
  processType: ProcessTypeSchema,
  targetSubject: z.string().optional(),
  iteration: IterationSchema.optional(),
  description: z.string().optional(),
  relatedArticles: z.array(z.string()).optional(),
  remarks: z.string().optional(),
  logicExpression: z.string().optional(),
  softwareFunctions: z.array(SoftwareFunctionSchema).max(3).optional(),
  subDiagramRef: z.string().optional(),
});

/** ノード（情報または処理） */
export const DiagramNodeSchema = z.discriminatedUnion("type", [
  InformationNodeSchema,
  ProcessNodeSchema,
]);

/** エッジ */
export const EdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  role: EdgeRoleSchema.optional(),
});

/** メタデータ */
export const DiagramMetadataSchema = z.object({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  author: z.string().optional(),
  generator: z.string().optional(),
  lawId: z.string().optional(),
  lawName: z.string().optional(),
});

/** 審査機序図 */
export const KijoDiagramSchema = z.object({
  id: z.string().min(1),
  version: z.string().optional(),
  pageTitle: PageTitleSchema,
  nodes: z.array(DiagramNodeSchema).min(1),
  edges: z.array(EdgeSchema),
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
