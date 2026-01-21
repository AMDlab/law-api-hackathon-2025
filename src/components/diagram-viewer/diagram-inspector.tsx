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

const softwareFunctionCategories = [
  "user_input",
  "graphic_display",
  "text_display",
  "program_processing",
];

const softwareFunctionCategoryLabels: Record<string, string> = {
  user_input: "ユーザー入力",
  graphic_display: "グラフィック表示",
  text_display: "文字表示",
  program_processing: "プログラム処理",
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
const CONDITION_OPERATORS = [
  "EQ",
  "NE",
  "GT",
  "GTE",
  "LT",
  "LTE",
  "IN",
  "NOT_IN",
] as const;
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

              <div className="border-t pt-2 mt-2 space-y-2">
                <Label className="text-xs text-gray-500">
                  委任先法令の要件
                </Label>
                {(node.delegated_requirements ?? []).length === 0 && (
                  <div className="text-xs text-gray-400">
                    まだ要件がありません
                  </div>
                )}
                <div className="space-y-2">
                  {(node.delegated_requirements ?? []).map((item, index) => (
                    <div
                      key={`delegated-${index}`}
                      className="rounded border border-gray-200 p-2 space-y-2"
                    >
                      <RowInput
                        label="条文参照"
                        value={item.article_ref ?? ""}
                        onChange={(value) => {
                          const next = [...(node.delegated_requirements ?? [])];
                          next[index] = {
                            ...next[index],
                            article_ref: value,
                          };
                          onNodeChange(node.id, {
                            delegated_requirements: next,
                          });
                        }}
                      />
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">要件</Label>
                        <Textarea
                          value={item.requirement ?? ""}
                          onChange={(e) => {
                            const next = [
                              ...(node.delegated_requirements ?? []),
                            ];
                            next[index] = {
                              ...next[index],
                              requirement: e.target.value,
                            };
                            onNodeChange(node.id, {
                              delegated_requirements: next,
                            });
                          }}
                          className="text-sm h-16"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const next = [...(node.delegated_requirements ?? [])];
                          next.splice(index, 1);
                          onNodeChange(node.id, {
                            delegated_requirements:
                              next.length > 0 ? next : undefined,
                          });
                        }}
                      >
                        削除
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const next = [
                      ...(node.delegated_requirements ?? []),
                      {
                        article_ref: "",
                        requirement: "",
                      } as DelegatedRequirement,
                    ];
                    onNodeChange(node.id, {
                      delegated_requirements: next,
                    });
                  }}
                >
                  追加
                </Button>
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
                <Label className="text-xs text-gray-500">
                  ソフトウェア機能
                </Label>
                {(node.software_functions ?? []).length === 0 && (
                  <div className="text-xs text-gray-400">
                    まだソフトウェア機能がありません
                  </div>
                )}
                <div className="space-y-2">
                  {(node.software_functions ?? []).map((item, index) => (
                    <div
                      key={`software-${index}`}
                      className="rounded border border-gray-200 p-2 space-y-2"
                    >
                      <RowSelect
                        label="分類"
                        value={item.category}
                        onValueChange={(value) => {
                          const next = [...(node.software_functions ?? [])];
                          next[index] = {
                            ...next[index],
                            category: value as SoftwareFunction["category"],
                          };
                          onNodeChange(node.id, {
                            software_functions: next,
                          });
                        }}
                        options={softwareFunctionCategories}
                        optionLabels={softwareFunctionCategoryLabels}
                      />
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">説明</Label>
                        <Textarea
                          value={item.description ?? ""}
                          onChange={(e) => {
                            const next = [...(node.software_functions ?? [])];
                            next[index] = {
                              ...next[index],
                              description: e.target.value,
                            };
                            onNodeChange(node.id, {
                              software_functions: next,
                            });
                          }}
                          className="text-sm h-16"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const next = [...(node.software_functions ?? [])];
                          next.splice(index, 1);
                          onNodeChange(node.id, {
                            software_functions:
                              next.length > 0 ? next : undefined,
                          });
                        }}
                      >
                        削除
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const next = [
                      ...(node.software_functions ?? []),
                      {
                        category: "user_input",
                        description: "",
                      } satisfies SoftwareFunction,
                    ];
                    onNodeChange(node.id, {
                      software_functions: next,
                    });
                  }}
                >
                  追加
                </Button>
              </div>
            </div>
          )}

          {node.type === "decision" && (
            <div className="space-y-3">
              {(() => {
                const decisionNode = node as DecisionNode & {
                  decision_type?: "binary" | "multi";
                };
                type ConditionDraft = Partial<
                  NonNullable<DecisionNode["condition"]>
                >;
                const condition: ConditionDraft = decisionNode.condition ?? {};
                const lhs: NonNullable<DecisionNode["condition"]>["lhs"] =
                  condition.lhs ?? {};
                const rhs: NonNullable<DecisionNode["condition"]>["rhs"] =
                  condition.rhs ?? {};
                const rhsValue = rhs.value;
                const rhsValueType =
                  rhsValue === undefined
                    ? "unset"
                    : typeof rhsValue === "boolean"
                      ? "boolean"
                      : typeof rhsValue === "number"
                        ? "number"
                        : "string";

                const updateCondition = (updates: ConditionDraft) => {
                  const nextCondition: ConditionDraft = {
                    ...condition,
                    ...updates,
                    lhs: { ...(condition.lhs ?? {}), ...(updates.lhs ?? {}) },
                    rhs: { ...(condition.rhs ?? {}), ...(updates.rhs ?? {}) },
                  };

                  const hasOperator = Boolean(nextCondition.operator);
                  const hasLhs =
                    Boolean(nextCondition.lhs?.var) ||
                    Boolean(nextCondition.lhs?.desc);
                  const hasRhs =
                    nextCondition.rhs?.value !== undefined ||
                    Boolean(nextCondition.rhs?.var) ||
                    Boolean(nextCondition.rhs?.desc) ||
                    Boolean(nextCondition.rhs?.unit);

                  onNodeChange(node.id, {
                    condition:
                      hasOperator || hasLhs || hasRhs
                        ? (nextCondition as DecisionNode["condition"])
                        : undefined,
                  });
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
                    <div className="border-t pt-2 mt-2 space-y-2">
                      <Label className="text-xs text-gray-500">
                        分岐条件 (condition)
                      </Label>
                      <RowSelect
                        label="演算子"
                        value={condition.operator}
                        onValueChange={(value) =>
                          updateCondition({
                            operator: value
                              ? (value as NonNullable<
                                  DecisionNode["condition"]
                                >["operator"])
                              : undefined,
                          })
                        }
                        options={[...CONDITION_OPERATORS]}
                        allowUnset
                      />
                      <RowInput
                        label="左辺: 変数 (lhs.var)"
                        value={lhs.var ?? ""}
                        onChange={(value) =>
                          updateCondition({
                            lhs: { ...lhs, var: value || undefined },
                          })
                        }
                      />
                      <RowInput
                        label="左辺: 説明 (lhs.desc)"
                        value={lhs.desc ?? ""}
                        onChange={(value) =>
                          updateCondition({
                            lhs: { ...lhs, desc: value || undefined },
                          })
                        }
                      />
                      <RowSelect
                        label="右辺: 値の種類"
                        value={rhsValueType}
                        onValueChange={(value) => {
                          const type = value ?? "unset";
                          const nextValue =
                            type === "unset"
                              ? undefined
                              : type === "boolean"
                                ? false
                                : type === "number"
                                  ? 0
                                  : "";
                          updateCondition({
                            rhs: { ...rhs, value: nextValue },
                          });
                        }}
                        options={["unset", "string", "number", "boolean"]}
                        allowUnset={false}
                        optionLabels={{
                          unset: "未設定",
                          string: "文字列",
                          number: "数値",
                          boolean: "真偽値",
                        }}
                      />
                      {rhsValueType !== "unset" &&
                        rhsValueType !== "boolean" && (
                          <RowInput
                            label="右辺: 値 (rhs.value)"
                            value={
                              rhsValue === undefined ? "" : String(rhsValue)
                            }
                            onChange={(value) => {
                              const nextValue =
                                rhsValueType === "number"
                                  ? value === ""
                                    ? undefined
                                    : Number(value)
                                  : value;
                              updateCondition({
                                rhs: { ...rhs, value: nextValue },
                              });
                            }}
                          />
                        )}
                      {rhsValueType === "boolean" && (
                        <RowSelect
                          label="右辺: 値 (rhs.value)"
                          value={String(rhsValue ?? false)}
                          onValueChange={(value) =>
                            updateCondition({
                              rhs: {
                                ...rhs,
                                value: value === "true",
                              },
                            })
                          }
                          options={["true", "false"]}
                          allowUnset={false}
                          optionLabels={{
                            true: "true",
                            false: "false",
                          }}
                        />
                      )}
                      <RowInput
                        label="右辺: 変数 (rhs.var)"
                        value={rhs.var ?? ""}
                        onChange={(value) =>
                          updateCondition({
                            rhs: { ...rhs, var: value || undefined },
                          })
                        }
                      />
                      <RowInput
                        label="右辺: 説明 (rhs.desc)"
                        value={rhs.desc ?? ""}
                        onChange={(value) =>
                          updateCondition({
                            rhs: { ...rhs, desc: value || undefined },
                          })
                        }
                      />
                      <RowInput
                        label="右辺: 単位 (rhs.unit)"
                        value={rhs.unit ?? ""}
                        onChange={(value) =>
                          updateCondition({
                            rhs: { ...rhs, unit: value || undefined },
                          })
                        }
                      />
                    </div>
                    <div className="border-t pt-2 mt-2 space-y-2">
                      <Label className="text-xs text-gray-500">
                        選択肢 (options)
                      </Label>
                      {(decisionNode.options ?? []).length === 0 && (
                        <div className="text-xs text-gray-400">
                          まだ選択肢がありません
                        </div>
                      )}
                      <div className="space-y-2">
                        {(decisionNode.options ?? []).map((option, index) => (
                          <div
                            key={`option-${index}`}
                            className="rounded border border-gray-200 p-2 space-y-2"
                          >
                            <RowInput
                              label="値 (value)"
                              value={option.value ?? ""}
                              onChange={(value) => {
                                const next = [...(decisionNode.options ?? [])];
                                next[index] = {
                                  ...next[index],
                                  value,
                                };
                                onNodeChange(node.id, {
                                  options: next,
                                });
                              }}
                            />
                            <div className="space-y-1">
                              <Label className="text-xs text-gray-500">
                                説明 (description)
                              </Label>
                              <Textarea
                                value={option.description ?? ""}
                                onChange={(e) => {
                                  const next = [
                                    ...(decisionNode.options ?? []),
                                  ];
                                  next[index] = {
                                    ...next[index],
                                    description: e.target.value,
                                  };
                                  onNodeChange(node.id, {
                                    options: next,
                                  });
                                }}
                                className="text-sm h-16"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const next = [...(decisionNode.options ?? [])];
                                next.splice(index, 1);
                                onNodeChange(node.id, {
                                  options: next.length > 0 ? next : undefined,
                                });
                              }}
                            >
                              削除
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const next = [
                            ...(decisionNode.options ?? []),
                            { value: "", description: "" },
                          ];
                          onNodeChange(node.id, {
                            options: next,
                          });
                        }}
                      >
                        追加
                      </Button>
                    </div>
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
