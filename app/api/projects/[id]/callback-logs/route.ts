import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { checkProjectPermission } from "@/lib/api/project-helpers";
import { ProjectRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取项目的所有回调日志
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId } = await params;
    const { searchParams } = request.nextUrl;

    // 检查项目权限
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.VIEWER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限访问此项目");
    }

    // 获取查询参数
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const success = searchParams.get("success");
    const keyword = searchParams.get("keyword");

    // 构建查询条件
    const where: any = {
      callback: {
        mockApi: {
          projectId,
        },
      },
    };

    if (success !== null && success !== "all") {
      where.success = success === "true";
    }

    if (keyword) {
      where.OR = [
        { url: { contains: keyword } },
        { callback: { name: { contains: keyword } } },
        { callback: { url: { contains: keyword } } },
        { callback: { mockApi: { name: { contains: keyword } } } },
        { callback: { mockApi: { path: { contains: keyword } } } },
      ];
    }

    // 查询总数
    const total = await prisma.callbackLog.count({ where });

    // 查询日志列表
    const logs = await prisma.callbackLog.findMany({
      where,
      include: {
        callback: {
          select: {
            id: true,
            name: true,
            url: true,
            mockApi: {
              select: {
                id: true,
                name: true,
                path: true,
                method: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

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

// 删除项目的所有回调日志
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId } = await params;

    // 检查项目权限（需要 MANAGER 或更高权限）
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.MANAGER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限删除日志");
    }

    // 删除该项目所有回调日志
    await prisma.callbackLog.deleteMany({
      where: {
        callback: {
          mockApi: {
            projectId,
          },
        },
      },
    });

    return ApiResponse.success({ message: "所有回调日志已删除" });
  } catch (error) {
    return handleApiError(error);
  }
}
