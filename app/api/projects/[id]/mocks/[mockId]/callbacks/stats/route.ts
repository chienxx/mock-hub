import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";

interface RouteParams {
  params: Promise<{ id: string; mockId: string }>;
}

// 获取Mock API的回调统计信息
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId } = await params;
    const { searchParams } = request.nextUrl;

    // 时间范围参数
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 检查项目权限
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.VIEWER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限访问此项目");
    }

    // 检查Mock API是否存在
    const mockApi = await prisma.mockAPI.findFirst({
      where: {
        id: mockId,
        projectId,
      },
    });

    if (!mockApi) {
      return ApiResponse.notFound("Mock API不存在");
    }

    // 获取该Mock API的所有回调
    const callbacks = await prisma.mockCallback.findMany({
      where: { mockApiId: mockId },
      select: { id: true, name: true, url: true, enabled: true },
    });

    if (callbacks.length === 0) {
      return ApiResponse.success({
        summary: {
          totalCallbacks: 0,
          totalExecutions: 0,
          successRate: 0,
          avgResponseTime: 0,
        },
        callbackStats: [],
      });
    }

    const callbackIds = callbacks.map((cb) => cb.id);

    // 构建查询条件
    const where: {
      callbackId: { in: string[] };
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      callbackId: { in: callbackIds },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // 获取所有日志
    const logs = await prisma.callbackLog.findMany({
      where,
      select: {
        callbackId: true,
        success: true,
        responseTime: true,
      },
    });

    // 计算总体统计
    const totalExecutions = logs.length;
    const successCount = logs.filter((log) => log.success).length;
    const successRate =
      totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0;
    const avgResponseTime =
      logs.reduce((acc, log) => acc + (log.responseTime || 0), 0) /
        totalExecutions || 0;

    // 按回调分组统计
    const callbackStats = callbacks.map((callback) => {
      const callbackLogs = logs.filter(
        (log) => log.callbackId === callback.id,
      );
      const executions = callbackLogs.length;
      const successes = callbackLogs.filter((log) => log.success).length;
      const avgTime =
        callbackLogs.reduce((acc, log) => acc + (log.responseTime || 0), 0) /
          executions || 0;

      return {
        callbackId: callback.id,
        callbackName: callback.name,
        callbackUrl: callback.url,
        enabled: callback.enabled,
        totalExecutions: executions,
        successCount: successes,
        failureCount: executions - successes,
        successRate: executions > 0 ? (successes / executions) * 100 : 0,
        avgResponseTime: Math.round(avgTime),
      };
    });

    // 按执行次数排序
    callbackStats.sort((a, b) => b.totalExecutions - a.totalExecutions);

    return ApiResponse.success({
      summary: {
        totalCallbacks: callbacks.length,
        enabledCallbacks: callbacks.filter((cb) => cb.enabled).length,
        totalExecutions,
        successCount,
        failureCount: totalExecutions - successCount,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
      },
      callbackStats,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
