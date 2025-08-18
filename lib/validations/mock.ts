import { z } from "zod";
import { HTTPMethod, ProxyMode } from "@prisma/client";

// HTTP 方法验证
export const httpMethodSchema = z.nativeEnum(HTTPMethod);

// 代理模式验证
export const proxyModeSchema = z.nativeEnum(ProxyMode);

// 创建 Mock API 验证
export const createMockAPISchema = z.object({
  path: z
    .string()
    .min(1, "路径不能为空")
    .regex(/^\//, "路径必须以 / 开头")
    .max(500, "路径长度不能超过500字符"),
  method: httpMethodSchema,
  name: z.string().max(100, "名称长度不能超过100字符").optional(),
  description: z.string().max(1000, "描述长度不能超过1000字符").optional(),
  collectionId: z.string().optional(),
  proxyMode: proxyModeSchema.optional().default(ProxyMode.MOCK),
  responseStatus: z
    .number()
    .int("状态码必须是整数")
    .min(100, "状态码不能小于100")
    .max(599, "状态码不能大于599")
    .optional()
    .default(200),
  responseHeaders: z.record(z.string(), z.string()).optional(),
  responseBody: z.any().optional(),
});

// 更新 Mock API 验证
export const updateMockAPISchema = z.object({
  name: z.string().max(100, "名称长度不能超过100字符").optional(),
  description: z.string().max(1000, "描述长度不能超过1000字符").optional(),
  enabled: z.boolean().optional(),
  collectionId: z.string().nullable().optional(),
  proxyMode: proxyModeSchema.optional(),
  useFakerJs: z.boolean().optional(),
  responseDelay: z
    .number()
    .int("延迟必须是整数")
    .min(0, "延迟不能小于0ms")
    .max(30000, "延迟不能超过30秒")
    .nullable()
    .optional(),
  responseStatus: z
    .number()
    .int("状态码必须是整数")
    .min(100, "状态码不能小于100")
    .max(599, "状态码不能大于599")
    .optional(),
  responseHeaders: z.record(z.string(), z.string()).optional(),
  responseBody: z.any().optional(),
});

// 创建分组验证
export const createCollectionSchema = z.object({
  name: z
    .string()
    .min(1, "分组名称不能为空")
    .max(100, "分组名称长度不能超过100字符"),
  parentId: z.string().optional(),
});

// 更新分组验证
export const updateCollectionSchema = z.object({
  name: z
    .string()
    .min(1, "分组名称不能为空")
    .max(100, "分组名称长度不能超过100字符")
    .optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().int().optional(),
});

// Mock 规则验证
export const mockRuleSchema = z.object({
  name: z.string().max(100, "规则名称长度不能超过100字符").optional(),
  priority: z.number().int().min(0).max(999).optional().default(0),
  enabled: z.boolean().optional().default(true),
  conditions: z.record(z.string(), z.any()).optional(),
  statusCode: z
    .number()
    .int("状态码必须是整数")
    .min(100, "状态码不能小于100")
    .max(599, "状态码不能大于599")
    .optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
  delay: z
    .number()
    .int("延迟必须是整数")
    .min(0, "延迟不能小于0ms")
    .max(30000, "延迟不能超过30秒")
    .optional(),
});

// 导出类型
export type CreateMockAPIInput = z.infer<typeof createMockAPISchema>;
export type UpdateMockAPIInput = z.infer<typeof updateMockAPISchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
export type MockRuleInput = z.infer<typeof mockRuleSchema>;
