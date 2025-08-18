import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { error, serverError, validationError } from "./response";

// 自定义错误类
export class ApiError extends Error {
  constructor(
    public message: string,
    public code: number = -1,
    public status: number = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// 业务错误类
export class BusinessError extends ApiError {
  constructor(message: string) {
    super(message, -1, 400);
    this.name = "BusinessError";
  }
}

// 认证错误类
export class AuthError extends ApiError {
  constructor(message = "认证失败") {
    super(message, 401, 401);
    this.name = "AuthError";
  }
}

// 权限错误类
export class PermissionError extends ApiError {
  constructor(message = "权限不足") {
    super(message, 403, 403);
    this.name = "PermissionError";
  }
}

// 资源不存在错误类
export class NotFoundError extends ApiError {
  constructor(message = "资源不存在") {
    super(message, 404, 404);
    this.name = "NotFoundError";
  }
}

// 全局错误处理器（别名）
export function handleApiError(err: unknown): NextResponse {
  return handleError(err);
}

// 全局错误处理器
export function handleError(err: unknown): NextResponse {
  console.error("API Error:", err);

  // 处理自定义 API 错误
  if (err instanceof ApiError) {
    return error(err.message, err.code, err.status);
  }

  // 处理 Zod 验证错误
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return validationError("数据验证失败", errors);
  }

  // 处理 Prisma 错误
  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return error("数据已存在，请检查唯一字段", -1, 400);
      case "P2025":
        return error("相关记录不存在", 404, 404);
      case "P2003":
        return error("外键约束失败", -1, 400);
      default:
        return error("数据库操作失败", -1, 400);
    }
  }

  if (err instanceof PrismaClientValidationError) {
    return validationError("数据库验证失败");
  }

  // 处理标准错误
  if (err instanceof Error) {
    return serverError(
      process.env.NODE_ENV === "production" ? "服务器内部错误" : err.message,
    );
  }

  // 未知错误
  return serverError("未知错误");
}

// 错误处理装饰器（用于 API 路由）
export function withErrorHandler<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>,
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      return handleError(err);
    }
  };
}

// 异步错误捕获工具
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorMessage?: string,
): Promise<[T | null, Error | null]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (err) {
    if (errorMessage && err instanceof Error) {
      err.message = `${errorMessage}: ${err.message}`;
    }
    return [null, err as Error];
  }
}

// 断言工具
export function assert(
  condition: unknown,
  message: string,
  ErrorClass: typeof ApiError = BusinessError,
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message);
  }
}

// 断言存在
export function assertExists<T>(
  value: T | null | undefined,
  message = "资源不存在",
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(message);
  }
}

// 断言权限
export function assertPermission(
  hasPermission: boolean,
  message = "您没有权限执行此操作",
): asserts hasPermission {
  if (!hasPermission) {
    throw new PermissionError(message);
  }
}
