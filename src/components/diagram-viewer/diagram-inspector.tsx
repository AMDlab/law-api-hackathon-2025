"use client";

import { useState } from "react";
import type {
  DiagramNode,
  Edge,
  PropertyType,
  ProcessType,
  Plurality,
  Iteration,
  EdgeRole,
  TerminalResult,
  DelegatedRequirement,
  SoftwareFunction,
  DecisionNode,
} from "@/types/diagram";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DiagramInspectorProps {
  node: DiagramNode | null;
  edge: Edge | null;
  onNodeChange: (nodeId: string, updates: Partial<DiagramNode>) => void;
  onNodeDelete: (nodeId: string) => void;
  onEdgeChange: (edgeId: string, updates: Partial<Edge>) => void;
  onEdgeDelete: (edgeId: string) => void;
}

const propertyTypes = [
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
];

const processTypes = [
  "mechanical",
  "human_judgment",
  "consistency_check",
  "sub_diagram_reference",
  "undefined_input",
];

const edgeRoles = [
  "flow",
  "yes",
  "no",
  "option",
  "input",
  "output",
  "primary",
  "supporting",
];

const propertyTypeLabels: Record<string, string> = {
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

const processTypeLabels: Record<string, string> = {
  mechanical: "機械的処理",
  human_judgment: "人の認識/判断を含む",
  consistency_check: "整合確認",
  sub_diagram_reference: "部分審査機序図への参照",
  undefined_input: "入力情報不定処理",
};

const pluralityLabels: Record<string, string> = {
  single: "単数",
  multiple: "複数",
};

const iterationLabels: Record<string, string> = {
  single: "単体処理",
  iterative: "反復処理",
};

const edgeRoleLabels: Record<string, string> = {
  flow: "フロー",
  yes: "はい",
  no: "いいえ",
  option: "選択肢",
  input: "入力",
  output: "出力",
  primary: "正規情報",
  supporting: "裏付け情報",
};

const decisionTypeLabels: Record<string, string> = {
  binary: "二択",
  multi: "多択",
};

const terminalResultLabels: Record<string, string> = {
  start: "開始",
  end: "終了",
  pass: "適合",
  fail: "不適合",
};

const UNSET_VALUE = "__unset__";
const toJsonKey = (value: unknown) => {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return "invalid-json";
  }
};

function JsonField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: unknown;
  onChange: (next: unknown) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState<string>(
    value ? JSON.stringify(value, null, 2) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const handleBlur = () => {
    if (!text.trim()) {
      onChange(undefined);
      setError(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      onChange(parsed);
      setError(null);
    } catch {
      setError("JSON形式が不正です");
    }
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">{label}</Label>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full border rounded px-2 py-1 text-xs font-mono h-24"
      />
      {error && <div className="text-xs text-red-500">{error}</div>}
    </div>
  );
}

function RowInput({
  label,
  value,
  onChange,
  inputClassName,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputClassName?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName ?? "h-8 w-full text-sm"}
      />
    </div>
  );
}

function RowSelect({
  label,
  value,
  onValueChange,
  options,
  allowUnset = false,
  triggerClassName,
  optionLabels,
}: {
  label: string;
  value?: string | null;
  onValueChange: (value?: string) => void;
  options: string[];
  allowUnset?: boolean;
  triggerClassName?: string;
  optionLabels?: Record<string, string>;
}) {
  const fallbackValue =
    allowUnset || options.length === 0 ? UNSET_VALUE : options[0];
  const currentValue = value ?? fallbackValue;
  const displayValue =
    currentValue === UNSET_VALUE
      ? "未設定"
      : (optionLabels?.[currentValue] ?? currentValue);
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">{label}</Label>
      <Select
        value={currentValue ?? ""}
        onValueChange={(next) => {
          if (allowUnset && next === UNSET_VALUE) {
            onValueChange(undefined);
          } else {
            onValueChange(next);
          }
        }}
        disabled={options.length === 0}
      >
        <SelectTrigger className={triggerClassName ?? "h-8 w-full text-sm"}>
          <SelectValue>{displayValue}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowUnset && <SelectItem value={UNSET_VALUE}>未設定</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {optionLabels?.[option] ?? option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DiagramInspector({
  node,
  edge,
  onNodeChange,
  onNodeDelete,
  onEdgeChange,
  onEdgeDelete,
}: DiagramInspectorProps) {
  const hasSelection = Boolean(node || edge);
  const relatedArticlesValue = node?.related_articles?.join("\n") ?? "";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">インスペクタ</div>
      </div>

      {node && (
        <div className="space-y-4">
          <div className="border-b pb-3 space-y-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">タイトル</Label>
              <Input
                value={node.title}
                onChange={(e) =>
                  onNodeChange(node.id, { title: e.target.value })
                }
                className="h-8 text-sm"
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">タイプ</span>
              <span>
                {node.type === "information"
                  ? "情報"
                  : node.type === "process"
                    ? "処理"
                    : node.type === "decision"
                      ? "判定"
                      : "端子"}
              </span>
            </div>
            {node.type === "information" && (
              <RowInput
                label="記号"
                value={node.symbol ?? ""}
                onChange={(value) => onNodeChange(node.id, { symbol: value })}
                inputClassName="h-7 w-24 text-sm"
              />
            )}
          </div>

          {node.type === "information" && (
            <div className="space-y-2">
              <RowInput
                label="主体"
                value={node.subject ?? ""}
                onChange={(value) => onNodeChange(node.id, { subject: value })}
              />
              <RowInput
                label="性質"
                value={node.property ?? ""}
                onChange={(value) => onNodeChange(node.id, { property: value })}
              />
              <RowSelect
                label="性質の型"
                value={node.property_type}
                onValueChange={(value) =>
                  onNodeChange(node.id, {
                    property_type: value ? (value as PropertyType) : undefined,
                  })
                }
                options={propertyTypes}
                allowUnset
                optionLabels={propertyTypeLabels}
              />
              <RowSelect
                label="単数/複数"
                value={node.plurality}
                onValueChange={(value) =>
                  onNodeChange(node.id, {
                    plurality: value ? (value as Plurality) : undefined,
                  })
                }
                options={["single", "multiple"]}
                allowUnset
                optionLabels={pluralityLabels}
              />
              <RowInput
                label="単位"
                value={node.unit ?? ""}
                onChange={(value) => onNodeChange(node.id, { unit: value })}
              />

              <div className="border-t pt-2 mt-2 space-y-1">
                <Label className="text-xs text-gray-500">説明</Label>
                <Textarea
                  value={node.description ?? ""}
                  onChange={(e) =>
                    onNodeChange(node.id, { description: e.target.value })
                  }
                  className="text-sm h-20"
                />
              </div>

              <div className="border-t pt-2 mt-2 space-y-1">
                <Label className="text-xs text-gray-500">関連条項</Label>
                <Textarea
                  value={relatedArticlesValue}
                  onChange={(e) =>
                    onNodeChange(node.id, {
                      related_articles: e.target.value
                        .split("\n")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                  className="text-xs h-20"
                />
              </div>

              <div className="border-t pt-2 mt-2 space-y-1">
                <JsonField
                  key={toJsonKey(node.delegated_requirements)}
                  label="委任先法令の要件"
                  value={node.delegated_requirements}
                  onChange={(next) =>
                    onNodeChange(node.id, {
                      delegated_requirements: next as
                        | DelegatedRequirement[]
                        | undefined,
                    })
                  }
                  placeholder='[{"article_ref":"法::A1:P1","requirement":"..."}]'
                />
              </div>

              <div className="border-t pt-2 mt-2 space-y-1">
                <Label className="text-xs text-gray-500">備考</Label>
                <Textarea
                  value={node.remarks ?? ""}
                  onChange={(e) =>
                    onNodeChange(node.id, { remarks: e.target.value })
                  }
                  className="text-sm h-16"
                />
              </div>
            </div>
          )}

          {node.type === "process" && (
            <div className="space-y-2">
              <RowSelect
                label="処理の種類"
                value={node.process_type}
                onValueChange={(value) =>
                  onNodeChange(node.id, { process_type: value as ProcessType })
                }
                options={processTypes}
                optionLabels={processTypeLabels}
              />
              <RowInput
                label="対象主体"
                value={node.target_subject ?? ""}
                onChange={(value) =>
                  onNodeChange(node.id, { target_subject: value })
                }
              />
              <RowSelect
                label="単体/反復"
                value={node.iteration}
                onValueChange={(value) =>
                  onNodeChange(node.id, {
                    iteration: value ? (value as Iteration) : undefined,
                  })
                }
                options={["single", "iterative"]}
                allowUnset
                optionLabels={iterationLabels}
              />

              <div className="border-t pt-2 mt-2 space-y-1">
                <Label className="text-xs text-gray-500">説明</Label>
                <Textarea
                  value={node.description ?? ""}
                  onChange={(e) =>
                    onNodeChange(node.id, { description: e.target.value })
                  }
                  className="text-sm h-20"
                />
              </div>

              <div className="border-t pt-2 mt-2 space-y-1">
                <Label className="text-xs text-gray-500">論理式等</Label>
                <Input
                  value={node.logic_expression ?? ""}
                  onChange={(e) =>
                    onNodeChange(node.id, { logic_expression: e.target.value })
                  }
                  className="h-8 text-sm font-mono"
                />
              </div>

              <div className="border-t pt-2 mt-2 space-y-1">
                <Label className="text-xs text-gray-500">関連条項</Label>
                <Textarea
                  value={relatedArticlesValue}
                  onChange={(e) =>
                    onNodeChange(node.id, {
                      related_articles: e.target.value
                        .split("\n")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                  className="text-xs h-20"
                />
              </div>

              <div className="border-t pt-2 mt-2 space-y-1">
                <JsonField
                  key={toJsonKey(node.software_functions)}
                  label="ソフトウェア機能"
                  value={node.software_functions}
                  onChange={(next) =>
                    onNodeChange(node.id, {
                      software_functions: next as
                        | SoftwareFunction[]
                        | undefined,
                    })
                  }
                />
              </div>
            </div>
          )}

          {node.type === "decision" && (
            <div className="space-y-3">
              {(() => {
                const decisionNode = node as DecisionNode & {
                  decision_type?: "binary" | "multi";
                  options?: unknown;
                };
                return (
                  <>
                    <RowSelect
                      label="分岐タイプ"
                      value={decisionNode.decision_type ?? "binary"}
                      onValueChange={(value) =>
                        onNodeChange(node.id, {
                          decision_type: (value ?? "binary") as
                            | "binary"
                            | "multi",
                        })
                      }
                      options={["binary", "multi"]}
                      optionLabels={decisionTypeLabels}
                    />
                    <JsonField
                      key={toJsonKey(decisionNode.condition)}
                      label="分岐条件 (condition)"
                      value={decisionNode.condition}
                      onChange={(next) =>
                        onNodeChange(node.id, {
                          condition: next as DecisionNode["condition"],
                        })
                      }
                    />
                    <JsonField
                      key={toJsonKey(decisionNode.options)}
                      label="選択肢 (options)"
                      value={decisionNode.options}
                      onChange={(next) =>
                        onNodeChange(node.id, {
                          options: next as DecisionNode["options"],
                        })
                      }
                    />
                  </>
                );
              })()}
            </div>
          )}

          {node.type === "terminal" && (
            <div className="space-y-3">
              <RowSelect
                label="結果"
                value={node.result ?? "pass"}
                onValueChange={(value) =>
                  onNodeChange(node.id, { result: value as TerminalResult })
                }
                options={["start", "end", "pass", "fail"]}
                optionLabels={terminalResultLabels}
              />
            </div>
          )}

          <Button
            onClick={() => onNodeDelete(node.id)}
            variant="destructive"
            size="sm"
            className="w-full"
          >
            ノードを削除
          </Button>
        </div>
      )}

      {edge && (
        <div className="space-y-3">
          <div className="text-xs text-gray-500">選択エッジ: {edge.id}</div>
          <RowSelect
            label="役割"
            value={edge.role}
            onValueChange={(value) => {
              const next = value ? (value as EdgeRole) : undefined;
              onEdgeChange(edge.id, { role: next });
            }}
            options={edgeRoles}
            allowUnset
            optionLabels={edgeRoleLabels}
          />
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">ラベル</Label>
            <Input
              value={edge.label ?? ""}
              onChange={(e) => onEdgeChange(edge.id, { label: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <Button
            onClick={() => onEdgeDelete(edge.id)}
            variant="destructive"
            size="sm"
            className="w-full"
          >
            エッジを削除
          </Button>
        </div>
      )}

      {!hasSelection && (
        <div className="text-xs text-gray-500">
          ノードまたはエッジを選択してください
        </div>
      )}
    </div>
  );
}
