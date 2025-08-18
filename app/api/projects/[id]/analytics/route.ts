import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkProjectPermission } from "@/lib/api/project-helpers";
import { ProjectRole } from "@prisma/client";
import {
  success,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/api/response";
import { subDays, format, startOfDay, endOfDay } from "date-fns";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return unauthorized("未授权访问");
    }

    const { id: projectId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get("range") || "7d";

    // 检查项目权限
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.VIEWER,
    );

    if (!hasPermission) {
      return forbidden("无权访问该项目");
    }

    // 解析时间范围
    let startDate: Date;
    const endDate = new Date();

    switch (range) {
      case "24h":
        startDate = subDays(endDate, 1);
        break;
      case "7d":
        startDate = subDays(endDate, 7);
        break;
      case "30d":
        startDate = subDays(endDate, 30);
        break;
      case "90d":
        startDate = subDays(endDate, 90);
        break;
      default:
        startDate = subDays(endDate, 7);
    }

    // 获取项目的 Mock API 列表
    const mockApis = await prisma.mockAPI.findMany({
      where: { projectId },
      select: { id: true, name: true, path: true, method: true },
    });

    const mockApiIds = mockApis.map((api) => api.id);

    // 获取时间范围内的日志
    const logs = await prisma.aPILog.findMany({
      where: {
        mockApiId: { in: mockApiIds },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        mockApiId: true,
        method: true,
        statusCode: true,
        responseTime: true,
        createdAt: true,
      },
    });

    // 计算总览数据
    const totalCalls = logs.length;
    const successfulCalls = logs.filter(
      (log) => log.statusCode >= 200 && log.statusCode < 300,
    ).length;
    const successRate =
      totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    const avgResponseTime =
      totalCalls > 0
        ? Math.round(
            logs.reduce((sum, log) => sum + log.responseTime, 0) / totalCalls,
          )
        : 0;

    // 计算趋势（与上一期对比）
    const prevStartDate = subDays(
      startDate,
      Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const prevLogs = await prisma.aPILog.findMany({
      where: {
        mockApiId: { in: mockApiIds },
        createdAt: {
          gte: prevStartDate,
          lt: startDate,
        },
      },
      select: { id: true },
    });

    const prevTotalCalls = prevLogs.length;
    const trend =
      prevTotalCalls === 0
        ? ("stable" as const)
        : totalCalls > prevTotalCalls
          ? ("up" as const)
          : totalCalls < prevTotalCalls
            ? ("down" as const)
            : ("stable" as const);
    const trendPercent =
      prevTotalCalls > 0
        ? Math.round(((totalCalls - prevTotalCalls) / prevTotalCalls) * 100)
        : 0;

    // 计算今日活跃的 Mock API 数量
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const todayLogs = logs.filter(
      (log) => log.createdAt >= todayStart && log.createdAt <= todayEnd,
    );
    const dailyActive = new Set(todayLogs.map((log) => log.mockApiId)).size;

    // 生成 API 趋势数据（按天统计）
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const apiTrend = [];

    for (let i = 0; i < Math.min(days, 30); i++) {
      const dayStart = startOfDay(subDays(endDate, i));
      const dayEnd = endOfDay(subDays(endDate, i));
      const dayLogs = logs.filter(
        (log) => log.createdAt >= dayStart && log.createdAt <= dayEnd,
      );

      const dayCalls = dayLogs.length;
      const dayErrors = dayLogs.filter((log) => log.statusCode >= 400).length;
      const dayAvgTime =
        dayCalls > 0
          ? Math.round(
              dayLogs.reduce((sum, log) => sum + log.responseTime, 0) /
                dayCalls,
            )
          : 0;

      apiTrend.unshift({
        date: format(dayStart, "MM-dd"),
        calls: dayCalls,
        errors: dayErrors,
        avgTime: dayAvgTime,
      });
    }

    // 状态码分布
    const statusGroups = {
      "2xx 成功": logs.filter(
        (log) => log.statusCode >= 200 && log.statusCode < 300,
      ).length,
      "4xx 客户端错误": logs.filter(
        (log) => log.statusCode >= 400 && log.statusCode < 500,
      ).length,
      "5xx 服务器错误": logs.filter((log) => log.statusCode >= 500).length,
      其他: logs.filter((log) => log.statusCode < 200 || log.statusCode >= 600)
        .length,
    };

    const statusDistribution = Object.entries(statusGroups)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: Math.round((value / totalCalls) * 100),
      }));

    // 响应时间分布
    const timeRanges = [
      { range: "0-100ms", min: 0, max: 100 },
      { range: "100-500ms", min: 100, max: 500 },
      { range: "500-1000ms", min: 500, max: 1000 },
      { range: "1000ms+", min: 1000, max: Infinity },
    ];

    const responseTimeDistribution = timeRanges.map(({ range, min, max }) => ({
      range,
      count: logs.filter(
        (log) => log.responseTime >= min && log.responseTime < max,
      ).length,
    }));

    // 热门 API 排行
    const apiCallsMap = new Map<
      string,
      {
        calls: number;
        errors: number;
        totalTime: number;
      }
    >();

    logs.forEach((log) => {
      const current = apiCallsMap.get(log.mockApiId) || {
        calls: 0,
        errors: 0,
        totalTime: 0,
      };
      current.calls++;
      if (log.statusCode >= 400) current.errors++;
      current.totalTime += log.responseTime;
      apiCallsMap.set(log.mockApiId, current);
    });

    const topApis = Array.from(apiCallsMap.entries())
      .map(([mockApiId, stats]) => {
        const mockApi = mockApis.find((api) => api.id === mockApiId);
        return {
          id: mockApiId,
          name: mockApi?.name || "",
          path: mockApi?.path || "",
          method: mockApi?.method || "GET",
          calls: stats.calls,
          successRate: ((stats.calls - stats.errors) / stats.calls) * 100,
          avgTime: Math.round(stats.totalTime / stats.calls),
        };
      })
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    // 请求方法分布
    const methodCounts = {
      GET: 0,
      POST: 0,
      PUT: 0,
      DELETE: 0,
    };

    logs.forEach((log) => {
      if (log.method in methodCounts) {
        methodCounts[log.method as keyof typeof methodCounts]++;
      }
    });

    const methodDistribution = Object.entries(methodCounts)
      .filter(([, count]) => count > 0)
      .map(([method, count]) => ({
        method,
        count,
        percentage: Math.round((count / totalCalls) * 100),
      }));

    return success({
      overview: {
        totalCalls,
        totalMocks: mockApis.length,
        successRate,
        avgResponseTime,
        dailyActive,
        trend,
        trendPercent,
      },
      apiTrend,
      statusDistribution,
      responseTimeDistribution,
      topApis,
      methodDistribution,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return serverError("获取分析数据失败");
  }
}
