// Mock规则相关类型定义

// 条件操作符
export type ConditionOperator =
  | "equals"
  | "contains"
  | "gt"
  | "lt"
  | "between"
  | "in";

// 条件字段类型
export type FieldType = "query" | "body" | "header" | "param";

// 单个条件
export interface RuleCondition {
  field: string; // 字段路径，如 query.userId, body.amount
  operator: ConditionOperator;
  value: string | number | boolean | (string | number)[]; // 根据操作符不同，可能是字符串、数字、数组等
}

// 条件组（最多5个条件）
export interface ConditionGroup {
  type: "AND" | "OR";
  conditions: RuleCondition[];
}

// Mock规则
export interface MockRule {
  id: string;
  mockApiId: string;
  priority: number; // 数字越小优先级越高
  enabled: boolean;
  name?: string;
  conditions?: ConditionGroup;
  statusCode?: number;
  headers?: Record<string, string>;
  body?: unknown; // 支持Mock.js语法
  delay?: number; // 响应延迟(ms)
  createdAt: Date;
  updatedAt: Date;
}

// 创建规则输入
export interface CreateMockRuleInput {
  mockApiId: string;
  name?: string;
  enabled?: boolean;
  priority?: number;
  conditions?: ConditionGroup;
  statusCode?: number;
  headers?: Record<string, string>;
  body?: unknown;
  delay?: number;
}

// 更新规则输入
export interface UpdateMockRuleInput {
  name?: string;
  enabled?: boolean;
  priority?: number;
  conditions?: ConditionGroup;
  statusCode?: number;
  headers?: Record<string, string>;
  body?: unknown;
  delay?: number;
}

// 规则测试请求
export interface TestRuleRequest {
  method: string;
  path: string;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
}

// 规则测试响应
export interface TestRuleResponse {
  matched: boolean;
  ruleId?: string;
  ruleName?: string;
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    body: unknown;
  };
}
