/**
 * 機序図・フロー図のバリデーション
 *
 * JSON Schemaによる検証: schema-validator.ts (ajv使用)
 * このファイルは型定義とグラフ検証のみを提供
 */

// JSON Schema検証をre-export
export {
  validateKijoDiagram,
  validateFlowDiagram,
  formatErrors,
  type ValidationResult,
} from "./schema-validator";

// ========================================
// ID バリデーション
// ========================================

/**
 * e-Gov法令ID形式のバリデーション
 * 例: 325AC0000000201（建築基準法）
 */
export function isValidLawId(id: string): boolean {
  return /^[A-Z0-9]{3,20}$/i.test(id);
}

/**
 * 条文ID形式のバリデーション
 * 例: A43_P1_kijo, A43_P1_flow, A112_P1_I2_kijo
 */
export function isValidArticleId(id: string): boolean {
  return /^A\d+(?:_\d+)*(?:_P\d+)?(?:_I\d+)?(?:_kijo|_flow)?$/.test(id);
}

/**
 * 図の種類を判定
 */
export function getDiagramType(id: string): "kijo" | "flow" | null {
  if (id.endsWith("_kijo")) return "kijo";
  if (id.endsWith("_flow")) return "flow";
  return null;
}

/**
 * 条文IDからベースID（_kijo/_flowを除いた部分）を取得
 */
export function getBaseArticleId(id: string): string {
  return id.replace(/_(kijo|flow)$/, "");
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
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

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
