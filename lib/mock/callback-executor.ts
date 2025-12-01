import { prisma } from "@/lib/prisma";
import type { MockCallback, Prisma } from "@prisma/client";

interface RequestContext {
  method: string;
  path: string;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
}

interface ResponseContext {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * 执行Mock API的回调
 * 在Mock响应返回后异步执行，不阻塞主流程
 */
export async function executeCallbacks(
  mockApiId: string,
  requestContext: RequestContext,
  responseContext: ResponseContext,
): Promise<void> {
  try {
    // 获取所有启用的回调配置，按顺序排序
    const callbacks = await prisma.mockCallback.findMany({
      where: {
        mockApiId,
        enabled: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    if (callbacks.length === 0) {
      return;
    }

    // 异步执行所有回调（不等待结果）
    setImmediate(() => {
      executeCallbacksSequentially(callbacks, requestContext, responseContext);
    });
  } catch (error) {
    // 静默失败，不影响主流程
    console.error("Failed to load callbacks:", error);
  }
}

/**
 * 按顺序执行回调
 */
async function executeCallbacksSequentially(
  callbacks: MockCallback[],
  requestContext: RequestContext,
  responseContext: ResponseContext,
): Promise<void> {
  for (const callback of callbacks) {
    try {
      await executeSingleCallback(callback, requestContext, responseContext);
    } catch (error) {
      // 记录错误但继续执行下一个回调
      console.error(
        `Callback ${callback.id} (${callback.name || callback.url}) failed:`,
        error,
      );
    }
  }
}

/**
 * 执行单个回调
 */
async function executeSingleCallback(
  callback: MockCallback,
  requestContext: RequestContext,
  responseContext: ResponseContext,
): Promise<void> {
  // 应用延迟
  if (callback.delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, callback.delay));
  }

  // 准备请求数据（支持变量替换）
  const callbackUrl = replaceVariables(
    callback.url,
    requestContext,
    responseContext,
  );
  const callbackHeaders = callback.headers
    ? replaceVariablesInObject(
        callback.headers as Record<string, unknown>,
        requestContext,
        responseContext,
      )
    : {};
  const callbackBody = callback.body
    ? replaceVariablesInObject(
        callback.body as Record<string, unknown>,
        requestContext,
        responseContext,
      )
    : undefined;

  // 执行HTTP请求
  const startTime = Date.now();
  let logData: {
    callbackId: string;
    url: string;
    method: string;
    requestHeaders: Record<string, unknown>;
    requestBody: Record<string, unknown> | undefined;
    statusCode?: number;
    responseHeaders?: Record<string, string>;
    responseBody?: unknown;
    responseTime?: number;
    error?: string;
    success: boolean;
  } = {
    callbackId: callback.id,
    url: callbackUrl,
    method: callback.method,
    requestHeaders: callbackHeaders,
    requestBody: callbackBody,
    success: false,
  };

  try {
    const fetchOptions: RequestInit = {
      method: callback.method,
      headers: {
        "Content-Type": "application/json",
        ...callbackHeaders,
      },
    };

    // 只有POST、PUT、DELETE方法才发送body
    if (
      callbackBody &&
      ["POST", "PUT", "DELETE"].includes(callback.method)
    ) {
      fetchOptions.body = JSON.stringify(callbackBody);
    }

    const response = await fetch(callbackUrl, fetchOptions);
    const responseTime = Date.now() - startTime;

    // 获取响应数据
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: unknown;
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }
    } catch {
      responseBody = null;
    }

    // 更新日志数据
    logData = {
      ...logData,
      statusCode: response.status,
      responseHeaders,
      responseBody,
      responseTime,
      success: response.ok, // 2xx 状态码认为是成功
    };

    // 记录日志到数据库
    await recordCallbackLog(logData);

    // 开发环境打印日志
    if (process.env.NODE_ENV === "development") {
      console.log(
        `Callback executed: ${callback.method} ${callbackUrl} - ${response.status} (${responseTime}ms)`,
      );
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // 更新日志数据
    logData = {
      ...logData,
      responseTime,
      error: errorMessage,
      success: false,
    };

    // 记录日志到数据库
    await recordCallbackLog(logData);

    console.error(
      `Callback failed: ${callback.method} ${callbackUrl} (${responseTime}ms)`,
      error,
    );
    throw error;
  }
}

/**
 * 记录回调日志到数据库
 */
async function recordCallbackLog(data: {
  callbackId: string;
  url: string;
  method: string;
  requestHeaders: Record<string, unknown>;
  requestBody: Record<string, unknown> | undefined;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  responseTime?: number;
  error?: string;
  success: boolean;
}): Promise<void> {
  try {
    await prisma.callbackLog.create({
      data: {
        callbackId: data.callbackId,
        url: data.url,
        method: data.method,
        requestHeaders: data.requestHeaders as Prisma.InputJsonValue,
        requestBody: data.requestBody as Prisma.InputJsonValue,
        statusCode: data.statusCode,
        responseHeaders: data.responseHeaders as Prisma.InputJsonValue,
        responseBody: data.responseBody as Prisma.InputJsonValue,
        responseTime: data.responseTime,
        error: data.error,
        success: data.success,
      },
    });
  } catch (error) {
    // 日志记录失败不影响主流程
    console.error("Failed to record callback log:", error);
  }
}

/**
 * 替换字符串中的变量
 * 支持的变量格式：
 * - {{request.query.userId}} - 请求查询参数
 * - {{request.body.name}} - 请求体字段
 * - {{request.headers.authorization}} - 请求头
 * - {{request.params.id}} - 路径参数
 * - {{response.body.userId}} - 响应体字段
 * - {{response.statusCode}} - 响应状态码
 */
function replaceVariables(
  template: string,
  requestContext: RequestContext,
  responseContext: ResponseContext,
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getValueByPath(path.trim(), requestContext, responseContext);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * 递归替换对象中的所有变量
 */
function replaceVariablesInObject(
  obj: Record<string, unknown>,
  requestContext: RequestContext,
  responseContext: ResponseContext,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = replaceVariables(value, requestContext, responseContext);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "string"
          ? replaceVariables(item, requestContext, responseContext)
          : item,
      );
    } else if (value && typeof value === "object") {
      result[key] = replaceVariablesInObject(
        value as Record<string, unknown>,
        requestContext,
        responseContext,
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * 根据路径获取值
 */
function getValueByPath(
  path: string,
  requestContext: RequestContext,
  responseContext: ResponseContext,
): unknown {
  const segments = path.split(".");
  const [source, ...rest] = segments;

  let value: unknown;

  // 确定数据源
  if (source === "request") {
    if (rest.length === 0) return undefined;

    const [dataType, ...fieldPath] = rest;
    switch (dataType) {
      case "query":
        value = requestContext.query;
        break;
      case "body":
        value = requestContext.body;
        break;
      case "headers":
      case "header":
        value = requestContext.headers;
        break;
      case "params":
      case "param":
        value = requestContext.params;
        break;
      case "method":
        return requestContext.method;
      case "path":
        return requestContext.path;
      default:
        return undefined;
    }

    // 遍历字段路径
    for (const key of fieldPath) {
      if (value === null || value === undefined) return undefined;
      value = (value as Record<string, unknown>)[key];
    }

    return value;
  } else if (source === "response") {
    if (rest.length === 0) return undefined;

    const [dataType, ...fieldPath] = rest;
    switch (dataType) {
      case "body":
        value = responseContext.body;
        break;
      case "headers":
      case "header":
        value = responseContext.headers;
        break;
      case "statusCode":
      case "status":
        return responseContext.statusCode;
      default:
        return undefined;
    }

    // 遍历字段路径
    for (const key of fieldPath) {
      if (value === null || value === undefined) return undefined;
      value = (value as Record<string, unknown>)[key];
    }

    return value;
  }

  return undefined;
}

/**
 * 测试回调配置
 * 用于在前端测试回调是否配置正确
 */
export async function testCallback(
  callbackId: string,
  requestContext: RequestContext,
  responseContext: ResponseContext,
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    const callback = await prisma.mockCallback.findUnique({
      where: { id: callbackId },
    });

    if (!callback) {
      return { success: false, error: "Callback not found" };
    }

    await executeSingleCallback(callback, requestContext, responseContext);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
