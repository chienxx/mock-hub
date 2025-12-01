import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";

interface RouteParams {
  params: Promise<{ id: string; mockId: string; logId: string }>;
}

// 获取单条回调日志详情
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId, logId } = await params;

    // 检查项目权限
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.VIEWER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限访问此项目");
    }

    // 查询日志，并确保它属于指定的Mock API和项目
    const log = await prisma.callbackLog.findFirst({
      where: {
        id: logId,
        callback: {
          mockApiId: mockId,
          mockApi: {
            projectId,
          },
        },
      },
      include: {
        callback: {
          select: {
            id: true,
            name: true,
            url: true,
            method: true,
            delay: true,
          },
        },
      },
    });

    if (!log) {
      return ApiResponse.notFound("日志不存在");
    }

    return ApiResponse.success(log);
  } catch (error) {
    return handleApiError(error);
  }
}
