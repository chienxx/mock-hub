import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { OperationType } from "@prisma/client";
import { logOperation } from "@/lib/services/operation-log-service";

export interface OperationConfig {
  type: OperationType;
  module: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: string | ((req: NextRequest, res: any) => string);
  skipOnError?: boolean; // 是否在错误时跳过日志记录
  extractTarget?: (
    req: NextRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: any,
  ) => { id?: string; name?: string };
}

/**
 * API 路由包装器，自动记录操作日志
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withOperationLog<T extends any[]>(
  config: OperationConfig,
  handler: (...args: T) => Promise<NextResponse | Response>,
) {
  return async (...args: T): Promise<NextResponse | Response> => {
    const startTime = Date.now();
    let response: NextResponse | Response;
    let status: "SUCCESS" | "FAILED" = "SUCCESS";
    let errorMessage: string | undefined;

    try {
      // 获取请求对象
      const request = args[0] as NextRequest;

      // 执行原始处理器
      response = await handler(...args);

      // 检查响应状态
      const responseData =
        response instanceof NextResponse
          ? await response
              .clone()
              .json()
              .catch(() => ({}))
          : {};

      if (response.status >= 400) {
        status = "FAILED";
        errorMessage = responseData.message || `HTTP ${response.status}`;
      }

      // 获取会话信息
      const session = await auth();
      if (!session?.user) {
        return response;
      }

      // 如果配置了在错误时跳过，且状态为失败，则跳过记录
      if (config.skipOnError && status === "FAILED") {
        return response;
      }

      // 生成操作描述
      const action =
        typeof config.action === "function"
          ? config.action(request, responseData)
          : config.action;

      // 提取目标信息
      const target = config.extractTarget
        ? config.extractTarget(request, responseData)
        : {};

      // 记录操作日志（异步，不等待）
      logOperation(
        {
          userId: session.user.id,
          type: config.type,
          module: config.module,
          action,
          targetId: target.id,
          targetName: target.name,
          status,
          errorMessage,
          duration: Date.now() - startTime,
          metadata: {
            method: request.method,
            path: request.nextUrl.pathname,
            query: Object.fromEntries(request.nextUrl.searchParams),
          },
        },
        request,
      ).catch((error) => {
        console.error("[OperationLog] Failed to log operation:", error);
      });

      return response;
    } catch (error) {
      // 处理未捕获的错误
      status = "FAILED";
      errorMessage = error instanceof Error ? error.message : String(error);

      // 获取会话信息（如果可能）
      try {
        const session = await auth();
        if (session?.user && !config.skipOnError) {
          const request = args[0] as NextRequest;

          logOperation(
            {
              userId: session.user.id,
              type: config.type,
              module: config.module,
              action:
                typeof config.action === "function"
                  ? config.action(request, null)
                  : config.action,
              status: "FAILED",
              errorMessage,
              duration: Date.now() - startTime,
            },
            request,
          ).catch((err) => {
            console.error("[OperationLog] Failed to log error operation:", err);
          });
        }
      } catch (logError) {
        console.error("[OperationLog] Failed to log on error:", logError);
      }

      throw error;
    }
  };
}

/**
 * 条件记录操作日志
 * 只有当条件满足时才记录日志
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withConditionalLog<T extends any[]>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  condition: (req: NextRequest, res: any) => OperationConfig | null,
  handler: (...args: T) => Promise<NextResponse | Response>,
) {
  return async (...args: T): Promise<NextResponse | Response> => {
    const request = args[0] as NextRequest;
    const response = await handler(...args);

    try {
      const responseData =
        response instanceof NextResponse
          ? await response
              .clone()
              .json()
              .catch(() => ({}))
          : {};

      const config = condition(request, responseData);
      if (!config) {
        return response;
      }

      const session = await auth();
      if (!session?.user) {
        return response;
      }

      // 记录操作日志
      await logOperation(
        {
          userId: session.user.id,
          type: config.type,
          module: config.module,
          action:
            typeof config.action === "function"
              ? config.action(request, responseData)
              : config.action,
          status: response.status < 400 ? "SUCCESS" : "FAILED",
        },
        request,
      );
    } catch (error) {
      console.error("[OperationLog] Conditional log failed:", error);
    }

    return response;
  };
}

/**
 * 批量操作日志记录
 */
export async function logBatchOperations(
  operations: Array<{
    params: Parameters<typeof logOperation>[0];
    request?: NextRequest;
  }>,
): Promise<void> {
  const promises = operations.map(({ params, request }) =>
    logOperation(params, request).catch((error) => {
      console.error("[OperationLog] Batch operation failed:", error);
    }),
  );

  await Promise.all(promises);
}
