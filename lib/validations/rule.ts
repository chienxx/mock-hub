import { z } from "zod";

// 条件操作符
const conditionOperatorSchema = z.enum([
  "equals",
  "contains",
  "gt",
  "lt",
  "between",
  "in",
]);

// 单个条件
const ruleConditionSchema = z
  .object({
    field: z.string().min(1, "字段不能为空"),
    operator: conditionOperatorSchema,
    value: z.any(), // 根据操作符不同，值的类型也不同
  })
  .refine(
    (data) => {
      // 验证不同操作符对应的值类型
      if (data.operator === "between") {
        return Array.isArray(data.value) && data.value.length === 2;
      }
      if (data.operator === "in") {
        return Array.isArray(data.value) && data.value.length > 0;
      }
      return data.value !== undefined && data.value !== null;
    },
    {
      message: "条件值格式不正确",
    },
  );

// 条件组（最多5个条件）
const conditionGroupSchema = z.object({
  type: z.enum(["AND", "OR"]),
  conditions: z.array(ruleConditionSchema).max(5, "最多支持5个条件"),
});

// 创建规则
export const createMockRuleSchema = z.object({
  mockApiId: z.string().min(1, "Mock API ID不能为空"),
  name: z.string().optional(),
  enabled: z.boolean().optional().default(true),
  conditions: conditionGroupSchema.optional(),
  statusCode: z.number().int().min(100).max(599).optional().default(200),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
  delay: z.number().int().min(0).max(10000).optional().default(0),
});

// 更新规则
export const updateMockRuleSchema = z.object({
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  conditions: conditionGroupSchema.optional(),
  statusCode: z.number().int().min(100).max(599).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
  delay: z.number().int().min(0).max(10000).optional(),
});

// 批量更新优先级
export const updateRulePrioritiesSchema = z.object({
  rules: z.array(
    z.object({
      id: z.string(),
      priority: z.number().int().min(0),
    }),
  ),
});

// 测试规则请求
export const testRuleRequestSchema = z.object({
  method: z.string(),
  path: z.string(),
  query: z.record(z.string(), z.any()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
  params: z.record(z.string(), z.string()).optional(),
});

export type CreateMockRuleInput = z.infer<typeof createMockRuleSchema>;
export type UpdateMockRuleInput = z.infer<typeof updateMockRuleSchema>;
export type UpdateRulePrioritiesInput = z.infer<
  typeof updateRulePrioritiesSchema
>;
export type TestRuleRequestInput = z.infer<typeof testRuleRequestSchema>;
