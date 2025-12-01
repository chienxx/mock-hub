import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";

interface RouteParams {
  params: Promise<{ id: string; mockId: string; callbackId: string }>;
}

// 获取单个回调的执行日志列表
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId, callbackId } = await params;
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

    // 检查项目权限
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.VIEWER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限访问此项目");
    }

    // 检查回调是否属于该Mock API和项目
    const callback = await prisma.mockCallback.findFirst({
      where: {
        id: callbackId,
        mockApiId: mockId,
        mockApi: {
          projectId,
        },
      },
    });

    if (!callback) {
      return ApiResponse.notFound("回调不存在");
    }

    // 构建查询条件
    const where: {
      callbackId: string;
      success?: boolean;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      callbackId,
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
