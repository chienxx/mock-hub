import { prisma } from "@/lib/prisma";
import { CacheManager } from "@/lib/cache";
import { sseManager } from "@/lib/sse/global-manager";
import { notifyApiError } from "@/lib/api/notification-helper";
import type { Prisma } from "@prisma/client";

interface LogData {
  mockApiId: string;
  method: string;
  path: string;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
  statusCode: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  responseTime: number;
  ruleId?: string | null;
  isProxied?: boolean;
  proxyUrl?: string | null;
  ip: string;
  userAgent?: string | null;
  userId?: string | null;
}

/**
 * 记录API调用日志
 */
export async function recordApiLog(data: LogData) {
  try {
    const log = await prisma.aPILog.create({
      data: {
        mockApiId: data.mockApiId,
        method: data.method,
        path: data.path,
        query: data.query ? (data.query as Prisma.InputJsonValue) : undefined,
        headers: data.headers
          ? (data.headers as Prisma.InputJsonValue)
          : undefined,
        body: data.body ? (data.body as Prisma.InputJsonValue) : undefined,
        statusCode: data.statusCode,
        responseHeaders: data.responseHeaders
          ? (data.responseHeaders as Prisma.InputJsonValue)
          : undefined,
        responseBody: data.responseBody
          ? (data.responseBody as Prisma.InputJsonValue)
          : undefined,
        responseTime: data.responseTime,
        ruleId: data.ruleId,
        isProxied: data.isProxied || false,
        proxyUrl: data.proxyUrl,
        ip: data.ip,
        userAgent: data.userAgent,
        userId: data.userId,
      },
    });

    // 更新缓存中的统计数据
    await updateApiStats(data.mockApiId, data.statusCode, data.responseTime);

    // 发送SSE通知
    await sendLogNotification(log);

    // 如果是错误响应，发送通知
    if (data.statusCode >= 500) {
      await notifyApiError(data.mockApiId, {
        method: data.method,
        path: data.path,
        statusCode: data.statusCode,
        errorMessage: `服务器错误: ${data.statusCode}`,
      });
    }

    return log;
  } catch {
    // 不影响主流程，静默失败
    return null;
  }
}

/**
 * 更新API统计数据缓存
 */
async function updateApiStats(
  mockApiId: string,
  statusCode: number,
  responseTime: number,
) {
  const statsKey = `stats:${mockApiId}:${new Date().toISOString().split("T")[0]}`;

  try {
    interface ApiStats {
      totalCalls: number;
      totalResponseTime: number;
      avgResponseTime: number;
      statusCodes: Record<number, number>;
      errors: number;
    }

    const stats: ApiStats = ((await CacheManager.get(
      "api-stats",
      statsKey,
    )) as ApiStats) || {
      totalCalls: 0,
      totalResponseTime: 0,
      avgResponseTime: 0,
      statusCodes: {},
      errors: 0,
    };

    stats.totalCalls++;
    stats.totalResponseTime += responseTime;
    stats.avgResponseTime = Math.round(
      stats.totalResponseTime / stats.totalCalls,
    );
    stats.statusCodes[statusCode] = (stats.statusCodes[statusCode] || 0) + 1;
    if (statusCode >= 400) {
      stats.errors++;
    }

    // 缓存1小时
    await CacheManager.set("api-stats", statsKey, stats, 3600);
  } catch {
    // 静默失败
  }
}

/**
 * 发送日志SSE通知
 */
async function sendLogNotification(log: Prisma.APILogGetPayload<object>) {
  try {
    // 获取Mock API的项目ID和详细信息
    const mockApi = await prisma.mockAPI.findUnique({
      where: { id: log.mockApiId },
      select: {
        id: true,
        projectId: true,
        name: true,
        path: true,
        method: true,
      },
    });

    if (mockApi) {
      // 构建完整的日志数据
      const logData = {
        id: log.id,
        mockApiId: log.mockApiId,
        method: log.method,
        path: log.path,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
        ip: log.ip,
        userAgent: log.userAgent,
        isProxied: log.isProxied,
        proxyUrl: log.proxyUrl,
        createdAt: log.createdAt.toISOString(),
        query: log.query,
        headers: log.headers,
        body: log.body,
        responseHeaders: log.responseHeaders,
        responseBody: log.responseBody,
        mockApi: {
          id: mockApi.id,
          name: mockApi.name,
          path: mockApi.path,
          method: mockApi.method,
        },
      };

      // 通过SSE广播完整的日志数据
      sseManager.broadcast(
        {
          type: "api-log",
          data: logData,
        },
        { projectId: mockApi.projectId },
      );
    }
  } catch {
    // 静默失败
  }
}

/**
 * 获取API日志
 */
export async function getApiLogs(
  mockApiId?: string,
  projectId?: string,
  options?: {
    page?: number;
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
    statusCode?: number;
    isProxied?: boolean;
    method?: string;
  },
) {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 20;

  const where: Prisma.APILogWhereInput = {};

  if (mockApiId) {
    where.mockApiId = mockApiId;
  }

  if (projectId) {
    where.mockApi = {
      projectId,
    };
  }

  if (options?.startDate || options?.endDate) {
    where.createdAt = {
      ...(options.startDate && { gte: options.startDate }),
      ...(options.endDate && { lte: options.endDate }),
    };
  }

  if (options?.statusCode) {
    where.statusCode = options.statusCode;
  }

  if (options?.isProxied !== undefined) {
    where.isProxied = options.isProxied;
  }

  if (options?.method && options.method !== "all") {
    where.method = options.method;
  }

  const [total, logs] = await Promise.all([
    prisma.aPILog.count({ where }),
    prisma.aPILog.findMany({
      where,
      include: {
        mockApi: {
          select: {
            id: true,
            name: true,
            path: true,
            method: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取API统计数据
 */
export async function getApiStatistics(
  projectId: string,
  dateRange: { start: Date; end: Date },
) {
  // 获取时间范围内的日志数据
  const logs = await prisma.aPILog.findMany({
    where: {
      mockApi: {
        projectId,
      },
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
    select: {
      statusCode: true,
      responseTime: true,
      createdAt: true,
      mockApiId: true,
      isProxied: true,
    },
  });

  // 按日期分组统计
  const dailyStats: Record<
    string,
    {
      date: string;
      totalCalls: number;
      avgResponseTime: number;
      successRate: number;
      errorCount: number;
    }
  > = {};

  logs.forEach((log) => {
    const date = log.createdAt.toISOString().split("T")[0];

    if (!dailyStats[date]) {
      dailyStats[date] = {
        date,
        totalCalls: 0,
        avgResponseTime: 0,
        successRate: 0,
        errorCount: 0,
      };
    }

    const stats = dailyStats[date];
    stats.totalCalls++;
    stats.avgResponseTime =
      (stats.avgResponseTime * (stats.totalCalls - 1) + log.responseTime) /
      stats.totalCalls;

    if (log.statusCode >= 400) {
      stats.errorCount++;
    }

    stats.successRate =
      ((stats.totalCalls - stats.errorCount) / stats.totalCalls) * 100;
  });

  // 按API分组统计
  const apiStats: Record<
    string,
    {
      mockApiId: string;
      totalCalls: number;
      avgResponseTime: number;
      errorRate: number;
      errorCount: number;
    }
  > = {};

  logs.forEach((log) => {
    if (!apiStats[log.mockApiId]) {
      apiStats[log.mockApiId] = {
        mockApiId: log.mockApiId,
        totalCalls: 0,
        avgResponseTime: 0,
        errorRate: 0,
        errorCount: 0,
      };
    }

    const stats = apiStats[log.mockApiId];
    stats.totalCalls++;
    stats.avgResponseTime =
      (stats.avgResponseTime * (stats.totalCalls - 1) + log.responseTime) /
      stats.totalCalls;

    if (log.statusCode >= 400) {
      stats.errorCount++;
    }
    stats.errorRate = (stats.errorCount / stats.totalCalls) * 100;
  });

  // 状态码分布
  const statusCodeDistribution: Record<string, number> = {};
  logs.forEach((log) => {
    const codeRange = `${Math.floor(log.statusCode / 100)}xx`;
    statusCodeDistribution[codeRange] =
      (statusCodeDistribution[codeRange] || 0) + 1;
  });

  return {
    summary: {
      totalCalls: logs.length,
      avgResponseTime:
        logs.reduce((acc, log) => acc + log.responseTime, 0) / logs.length || 0,
      successRate:
        (logs.filter((log) => log.statusCode < 400).length / logs.length) *
          100 || 0,
      proxyRate:
        (logs.filter((log) => log.isProxied).length / logs.length) * 100 || 0,
    },
    dailyStats: Object.values(dailyStats).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    apiStats: Object.values(apiStats)
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, 10),
    statusCodeDistribution,
  };
}
