import { prisma } from "@/lib/prisma";
import type { MockRule } from "@prisma/client";
import type { ConditionGroup, RuleCondition } from "@/types/rule";

interface RequestContext {
  method: string;
  path: string;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
}

/**
 * 执行规则匹配
 * 按优先级顺序检查规则，返回第一个匹配的规则
 */
export async function executeRule(
  mockApiId: string,
  context: RequestContext,
): Promise<MockRule | null> {
  // 获取所有启用的规则，按优先级排序
  const rules = await prisma.mockRule.findMany({
    where: {
      mockApiId,
      enabled: true,
    },
    orderBy: {
      priority: "asc", // 数字小的优先级高
    },
  });

  // 逐个检查规则
  for (const rule of rules) {
    if (matchRule(rule, context)) {
      return rule;
    }
  }

  return null;
}

/**
 * 检查单个规则是否匹配
 */
function matchRule(rule: MockRule, context: RequestContext): boolean {
  // 没有条件的规则总是匹配
  if (!rule.conditions) {
    return true;
  }

  const conditions = rule.conditions as unknown as ConditionGroup;

  // 没有具体条件的规则总是匹配
  if (!conditions.conditions || conditions.conditions.length === 0) {
    return true;
  }

  // 根据条件组类型执行匹配
  if (conditions.type === "AND") {
    // AND: 所有条件都必须满足
    return conditions.conditions.every((condition) =>
      matchCondition(condition, context),
    );
  } else {
    // OR: 至少一个条件满足
    return conditions.conditions.some((condition) =>
      matchCondition(condition, context),
    );
  }
}

/**
 * 检查单个条件是否匹配
 */
function matchCondition(
  condition: RuleCondition,
  context: RequestContext,
): boolean {
  // 获取字段值
  const fieldValue = getFieldValue(condition.field, context);

  // 字段不存在
  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }

  // 根据操作符进行匹配
  switch (condition.operator) {
    case "equals":
      return fieldValue === condition.value;

    case "contains":
      return String(fieldValue).includes(String(condition.value));

    case "gt":
      const gtNum = Number(fieldValue);
      const gtTarget = Number(condition.value);
      if (isNaN(gtNum) || isNaN(gtTarget)) return false;
      return gtNum > gtTarget;

    case "lt":
      const ltNum = Number(fieldValue);
      const ltTarget = Number(condition.value);
      if (isNaN(ltNum) || isNaN(ltTarget)) return false;
      return ltNum < ltTarget;

    case "between":
      if (!Array.isArray(condition.value) || condition.value.length !== 2) {
        return false;
      }
      const num = Number(fieldValue);
      const min = Number(condition.value[0]);
      const max = Number(condition.value[1]);
      if (isNaN(num) || isNaN(min) || isNaN(max)) return false;
      return num >= min && num <= max;

    case "in":
      if (!Array.isArray(condition.value)) {
        return false;
      }
      return condition.value.includes(String(fieldValue));

    default:
      return false;
  }
}

/**
 * 从请求上下文中获取字段值
 * 支持嵌套路径，如 query.userId, body.user.name
 */
function getFieldValue(fieldPath: string, context: RequestContext): unknown {
  const segments = fieldPath.split(".");
  const [source, ...path] = segments;

  let value: unknown;

  // 确定数据源
  switch (source) {
    case "query":
      value = context.query;
      break;
    case "body":
      value = context.body;
      break;
    case "header":
    case "headers":
      value = context.headers;
      break;
    case "param":
    case "params":
      value = context.params;
      break;
    default:
      return undefined;
  }

  // 没有更多路径，返回整个对象
  if (path.length === 0) {
    return value;
  }

  // 遍历路径获取嵌套值
  for (const key of path) {
    if (value === null || value === undefined) {
      return undefined;
    }

    // 处理header的特殊情况（不区分大小写）
    if (
      (source === "header" || source === "headers") &&
      typeof value === "object" &&
      value !== null
    ) {
      // 查找不区分大小写的header
      const headerKey = Object.keys(value).find(
        (k) => k.toLowerCase() === key.toLowerCase(),
      );
      value = headerKey
        ? (value as Record<string, unknown>)[headerKey]
        : undefined;
    } else {
      value = (value as Record<string, unknown>)[key];
    }
  }

  return value;
}

/**
 * 批量执行规则测试
 * 用于调试和测试规则配置
 */
export async function testRules(
  mockApiId: string,
  context: RequestContext,
): Promise<Array<{ rule: MockRule; matched: boolean }>> {
  const rules = await prisma.mockRule.findMany({
    where: {
      mockApiId,
      enabled: true,
    },
    orderBy: {
      priority: "asc",
    },
  });

  return rules.map((rule) => ({
    rule,
    matched: matchRule(rule, context),
  }));
}

/**
 * 验证条件配置是否有效
 */
export function validateConditions(conditions: ConditionGroup): string[] {
  const errors: string[] = [];

  if (!conditions.type || !["AND", "OR"].includes(conditions.type)) {
    errors.push("条件组类型必须是 AND 或 OR");
  }

  if (!Array.isArray(conditions.conditions)) {
    errors.push("条件必须是数组");
    return errors;
  }

  conditions.conditions.forEach((condition, index) => {
    if (!condition.field) {
      errors.push(`条件 ${index + 1}: 字段不能为空`);
    }

    if (!condition.operator) {
      errors.push(`条件 ${index + 1}: 操作符不能为空`);
    }

    const validOperators = ["equals", "contains", "gt", "lt", "between", "in"];
    if (!validOperators.includes(condition.operator)) {
      errors.push(`条件 ${index + 1}: 无效的操作符 ${condition.operator}`);
    }

    // 验证特定操作符的值
    if (condition.operator === "between") {
      if (!Array.isArray(condition.value) || condition.value.length !== 2) {
        errors.push(`条件 ${index + 1}: between 操作符需要包含两个值的数组`);
      }
    }

    if (condition.operator === "in") {
      if (!Array.isArray(condition.value)) {
        errors.push(`条件 ${index + 1}: in 操作符需要数组值`);
      }
    }
  });

  return errors;
}
