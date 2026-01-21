import Ajv from "ajv";
import addFormats from "ajv-formats";
import kijoSchema from "@/../schemas/kijo-diagram.schema.json";
import flowSchema from "@/../schemas/flow-diagram.schema.json";

// AJVインスタンス作成
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// スキーマをコンパイル
const validateKijo = ajv.compile(kijoSchema);
const validateFlow = ajv.compile(flowSchema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 機序図JSONをJSON Schemaで検証
 */
export function validateKijoDiagram(data: unknown): ValidationResult {
  const valid = validateKijo(data);
  if (valid) {
    return { valid: true, errors: [] };
  }
  const errors =
    validateKijo.errors?.map(
      (e) => `${e.instancePath || "root"}: ${e.message}`,
    ) || [];
  return { valid: false, errors };
}

/**
 * フロー図JSONをJSON Schemaで検証
 */
export function validateFlowDiagram(data: unknown): ValidationResult {
  const valid = validateFlow(data);
  if (valid) {
    return { valid: true, errors: [] };
  }
  const errors =
    validateFlow.errors?.map(
      (e) => `${e.instancePath || "root"}: ${e.message}`,
    ) || [];
  return { valid: false, errors };
}

/**
 * エラーメッセージをフォーマット
 */
export function formatErrors(result: ValidationResult): string {
  if (result.valid) return "";
  return result.errors.join("\n");
}
