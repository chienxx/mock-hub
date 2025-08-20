import { prisma } from "@/lib/prisma";
import { OperationType } from "@prisma/client";
import { NextRequest } from "next/server";

// 操作日志参数接口
export interface LogOperationParams {
  userId: string;
  type: OperationType;
  module: string;
  action: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, any>;
  status?: "SUCCESS" | "FAILED";
  errorMessage?: string;
  duration?: number; // 操作耗时（毫秒）
  requestId?: string; // 请求追踪ID
}

// 日志队列项
interface QueueItem extends LogOperationParams {
  ip: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * 操作日志服务 - 单例模式
 */
class OperationLogService {
  private static instance: OperationLogService;
  private queue: QueueItem[] = [];
  private batchSize = 10; // 批量写入大小
  private flushInterval = 5000; // 刷新间隔（毫秒）
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  private constructor() {
    this.startBatchProcessor();
  }

  static getInstance(): OperationLogService {
    if (!OperationLogService.instance) {
      OperationLogService.instance = new OperationLogService();
    }
    return OperationLogService.instance;
  }

  /**
   * 记录操作日志（异步，不阻塞主流程）
   */
  async log(
    params: LogOperationParams,
    request?: NextRequest | Request,
  ): Promise<void> {
    try {
      // 提取请求信息
      const { ip, userAgent } = this.extractRequestInfo(request);

      // 添加到队列
      this.queue.push({
        ...params,
        ip,
        userAgent,
        timestamp: new Date(),
      });

      // 如果队列达到批量大小，立即处理
      if (this.queue.length >= this.batchSize) {
        this.flush();
      }
    } catch (error) {
      // 记录日志失败不应影响主业务
      console.error("[OperationLog] Failed to add log to queue:", error);
    }
  }

  /**
   * 从请求中提取信息
   */
  private extractRequestInfo(request?: NextRequest | Request): {
    ip: string;
    userAgent?: string;
  } {
    if (!request) {
      return { ip: "unknown" };
    }

    let headers: Headers;
    if (request instanceof NextRequest) {
      headers = request.headers;
    } else {
      headers = request.headers;
    }

    const ip =
      headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      headers.get("x-real-ip") ||
      headers.get("cf-connecting-ip") || // Cloudflare
      headers.get("x-client-ip") ||
      "unknown";

    const userAgent = headers.get("user-agent") || undefined;

    return { ip, userAgent };
  }

  /**
   * 启动批处理器
   */
  private startBatchProcessor(): void {
    this.timer = setInterval(() => {
      if (this.queue.length > 0 && !this.isProcessing) {
        this.flush();
      }
    }, this.flushInterval);
  }

  /**
   * 刷新队列，批量写入数据库
   */
  private async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const itemsToProcess = this.queue.splice(0, this.batchSize);

    try {
      // 批量创建日志记录
      await prisma.operationLog.createMany({
        data: itemsToProcess.map((item) => ({
          userId: item.userId,
          type: item.type,
          module: item.module,
          action: item.action,
          targetId: item.targetId,
          targetName: item.targetName,
          metadata: item.metadata,
          status: item.status || "SUCCESS",
          errorMessage: item.errorMessage,
          ip: item.ip,
          userAgent: item.userAgent
            ? this.truncateUserAgent(item.userAgent)
            : null,
          createdAt: item.timestamp,
        })),
        skipDuplicates: true,
      });

      console.log(
        `[OperationLog] Successfully flushed ${itemsToProcess.length} logs`,
      );
    } catch (error) {
      console.error("[OperationLog] Failed to flush logs:", error);

      // 失败重试：将项目重新加入队列前端（带延迟）
      setTimeout(() => {
        this.queue.unshift(...itemsToProcess);
      }, 1000);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 截断 UserAgent 字符串
   */
  private truncateUserAgent(
    userAgent: string,
    maxLength: number = 500,
  ): string {
    if (userAgent.length <= maxLength) {
      return userAgent;
    }
    return userAgent.substring(0, maxLength - 3) + "...";
  }

  /**
   * 强制刷新所有待处理的日志
   */
  async forceFlush(): Promise<void> {
    while (this.queue.length > 0) {
      await this.flush();
    }
  }

  /**
   * 停止服务（用于优雅关闭）
   */
  async shutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.forceFlush();
  }
}

// 导出单例实例
export const operationLogService = OperationLogService.getInstance();

/**
 * 便捷的日志记录函数
 */
export async function logOperation(
  params: LogOperationParams,
  request?: NextRequest | Request,
): Promise<void> {
  return operationLogService.log(params, request);
}

/**
 * 操作日志装饰器（用于类方法）
 */
export function LogOperation(
  type: OperationType,
  module: string,
  actionTemplate?: string,
) {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let status: "SUCCESS" | "FAILED" = "SUCCESS";
      let errorMessage: string | undefined;
      let result: any;

      try {
        result = await originalMethod.apply(this, args);
        return result;
      } catch (error) {
        status = "FAILED";
        errorMessage = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        const duration = Date.now() - startTime;

        // 尝试从参数中提取必要信息
        const request = args.find(
          (arg) => arg instanceof NextRequest || arg instanceof Request,
        );
        const session = args.find((arg) => arg?.user?.id)?.user;

        if (session?.id) {
          await logOperation(
            {
              userId: session.id,
              type,
              module,
              action: actionTemplate || `${propertyKey} operation`,
              status,
              errorMessage,
              duration,
              metadata: { method: propertyKey },
            },
            request,
          );
        }
      }
    };

    return descriptor;
  };
}

/**
 * 获取操作类型的中文描述
 */
export function getOperationTypeLabel(type: OperationType): string {
  const labels: Record<OperationType, string> = {
    // 用户相关
    USER_LOGIN: "用户登录",
    USER_LOGOUT: "用户登出",
    USER_REGISTER: "用户注册",
    USER_CREATE: "创建用户",
    USER_DELETE: "删除用户",
    USER_BAN: "封禁/解封",
    USER_ROLE: "角色变更",
    USER_RESET_PWD: "重置密码",

    // 项目相关
    PROJECT_CREATE: "创建项目",
    PROJECT_UPDATE: "更新项目",
    PROJECT_DELETE: "删除项目",
    PROJECT_ARCHIVE: "归档项目",

    // 项目成员相关
    MEMBER_ADD: "添加成员",
    MEMBER_REMOVE: "移除成员",
    MEMBER_UPDATE: "更新成员角色",

    // Mock API相关
    MOCK_CREATE: "创建Mock",
    MOCK_UPDATE: "更新Mock",
    MOCK_DELETE: "删除Mock",
    MOCK_TOGGLE: "切换Mock状态",

    // 其他
    EXPORT: "导出数据",
    IMPORT: "导入数据",
    OTHER: "其他操作",
  };

  return labels[type] || type;
}

/**
 * 获取模块的中文名称
 */
export function getModuleLabel(module: string): string {
  const labels: Record<string, string> = {
    auth: "认证管理",
    user: "用户管理",
    project: "项目管理",
    member: "成员管理",
    mock: "Mock管理",
    system: "系统管理",
  };

  return labels[module] || module;
}

// 优雅关闭处理
if (typeof process !== "undefined") {
  process.on("SIGTERM", async () => {
    console.log("[OperationLog] Shutting down...");
    await operationLogService.shutdown();
  });

  process.on("SIGINT", async () => {
    console.log("[OperationLog] Shutting down...");
    await operationLogService.shutdown();
  });
}
