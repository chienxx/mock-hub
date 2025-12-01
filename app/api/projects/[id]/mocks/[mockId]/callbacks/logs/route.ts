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

// 获取Mock API的所有回调执行日志
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId } = await params;
    const { searchParams } = request.nextUrl;

    // 分页参数
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "20"),
      100,
    );

    // 筛选参数
    const success = searchParams.get("success");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const callbackId = searchParams.get("callbackId");

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

    // 获取该Mock API的所有回调ID
    const callbacks = await prisma.mockCallback.findMany({
      where: { mockApiId: mockId },
      select: { id: true },
    });

    const callbackIds = callbacks.map((cb) => cb.id);

    if (callbackIds.length === 0) {
      return ApiResponse.success({
        logs: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      });
    }

    // 构建查询条件
    const where: {
      callbackId: { in: string[] } | string;
      success?: boolean;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      callbackId: callbackId ? callbackId : { in: callbackIds },
    };

    if (success !== null && success !== undefined) {
      where.success = success === "true";
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // 查询日志
    const [total, logs] = await Promise.all([
      prisma.callbackLog.count({ where }),
      prisma.callbackLog.findMany({
        where,
        include: {
          callback: {
            select: {
              id: true,
              name: true,
              url: true,
              method: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return ApiResponse.success({
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
