"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type {
  ConditionGroup,
  RuleCondition,
  ConditionOperator,
} from "@/types/rule";

interface Props {
  value: ConditionGroup;
  onChange: (value: ConditionGroup) => void;
}

// 操作符选项
const OPERATORS: { value: ConditionOperator; label: string; hint?: string }[] =
  [
    { value: "equals", label: "等于", hint: "完全匹配" },
    { value: "contains", label: "包含", hint: "字符串包含" },
    { value: "gt", label: "大于", hint: "数值比较" },
    { value: "lt", label: "小于", hint: "数值比较" },
    { value: "between", label: "区间", hint: "如: [10, 100]" },
    { value: "in", label: "在列表中", hint: '如: ["a", "b"]' },
  ];

// 字段类型选项
const FIELD_TYPES = [
  { value: "query", label: "Query参数", example: "query.userId" },
  { value: "body", label: "Body参数", example: "body.amount" },
  { value: "header", label: "Header", example: "header.Authorization" },
  { value: "param", label: "路径参数", example: "param.id" },
];

export function ConditionEditor({ value, onChange }: Props) {
  const { type, conditions } = value;

  // 添加条件
  const addCondition = () => {
    if (conditions.length >= 5) {
      return; // 最多5个条件
    }

    const newCondition: RuleCondition = {
      field: "query.",
      operator: "equals",
      value: "",
    };

    onChange({
      type,
      conditions: [...conditions, newCondition],
    });
  };

  // 删除条件
  const removeCondition = (index: number) => {
    onChange({
      type,
      conditions: conditions.filter((_, i) => i !== index),
    });
  };

  // 更新条件
  const updateCondition = (
    index: number,
    field: keyof RuleCondition,
    value: string | number | string[] | number[] | ConditionOperator,
  ) => {
    const newConditions = [...conditions];
    newConditions[index] = {
      ...newConditions[index],
      [field]: value,
    };

    // 特殊处理：根据操作符类型转换值
    if (field === "operator") {
      const operator = value as ConditionOperator;
      if (operator === "between") {
        newConditions[index].value = [0, 100];
      } else if (operator === "in") {
        newConditions[index].value = [];
      } else if (operator === "gt" || operator === "lt") {
        newConditions[index].value = 0;
      } else {
        newConditions[index].value = "";
      }
    }

    onChange({
      type,
      conditions: newConditions,
    });
  };

  // 格式化值输入
  const formatValue = (operator: ConditionOperator, value: unknown): string => {
    if (operator === "between" || operator === "in") {
      return JSON.stringify(value || []);
    }
    return String(value || "");
  };

  // 解析值输入
  const parseValue = (
    operator: ConditionOperator,
    input: string,
  ): string | number | string[] | number[] => {
    if (operator === "between" || operator === "in") {
      try {
        return JSON.parse(input);
      } catch {
        return operator === "between" ? [0, 0] : [];
      }
    }
    if (operator === "gt" || operator === "lt") {
      return Number(input) || 0;
    }
    return input;
  };

  return (
    <div className="space-y-4">
      {/* 逻辑类型选择 */}
      {conditions.length > 1 && (
        <div className="flex items-center gap-4">
          <Label>条件逻辑:</Label>
          <RadioGroup
            value={type}
            onValueChange={(newType) =>
              onChange({ type: newType as "AND" | "OR", conditions })
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="AND" id="and" />
              <Label htmlFor="and">AND (所有条件都满足)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="OR" id="or" />
              <Label htmlFor="or">OR (任一条件满足)</Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* 条件列表 */}
      <div className="space-y-3">
        {conditions.map((condition, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-3 border rounded-lg"
          >
            <div className="flex-1 grid grid-cols-12 gap-2">
              {/* 字段输入 */}
              <div className="col-span-4">
                <Input
                  placeholder="字段路径"
                  value={condition.field}
                  onChange={(e) =>
                    updateCondition(index, "field", e.target.value)
                  }
                  list={`field-hints-${index}`}
                />
                <datalist id={`field-hints-${index}`}>
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.example} value={ft.example} />
                  ))}
                </datalist>
              </div>

              {/* 操作符选择 */}
              <div className="col-span-3">
                <Select
                  value={condition.operator}
                  onValueChange={(value) =>
                    updateCondition(index, "operator", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        <div className="flex items-center justify-between w-full">
                          <span>{op.label}</span>
                          {op.hint && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {op.hint}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 值输入 */}
              <div className="col-span-4">
                <Input
                  placeholder={
                    condition.operator === "between"
                      ? "[10, 100]"
                      : condition.operator === "in"
                        ? '["a", "b"]'
                        : "值"
                  }
                  value={formatValue(condition.operator, condition.value)}
                  onChange={(e) =>
                    updateCondition(
                      index,
                      "value",
                      parseValue(condition.operator, e.target.value),
                    )
                  }
                />
              </div>
            </div>

            {/* 删除按钮 */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1"
              onClick={() => removeCondition(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* 添加条件按钮 */}
      {conditions.length < 5 && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addCondition}
        >
          <Plus className="mr-2 h-4 w-4" />
          添加条件
          {conditions.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {conditions.length}/5
            </Badge>
          )}
        </Button>
      )}

      {conditions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          未设置条件时，所有请求都会匹配此规则
        </p>
      )}

      {conditions.length === 5 && (
        <p className="text-sm text-muted-foreground text-center">
          已达到最大条件数量限制
        </p>
      )}
    </div>
  );
}
