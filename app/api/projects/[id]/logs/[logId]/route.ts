import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkProjectPermission } from "@/lib/api/project-helpers";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string; logId: string }>;
}

/**
 * 删除API日志
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, logId } = await params;

    // 检查项目权限（需要DEVELOPER以上权限才能删除日志）
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      // 检查是否是项目创建者或系统管理员
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { creatorId: true },
      });

      const isCreator = project?.creatorId === session.user.id;
      const isAdmin = session.user.role === "ADMIN";

      if (!isCreator && !isAdmin) {
        return ApiResponse.forbidden("没有权限删除日志");
      }
    }

    // 验证日志属于该项目
    const log = await prisma.aPILog.findFirst({
      where: {
        id: logId,
        mockApi: {
          projectId,
        },
      },
    });

    if (!log) {
      return ApiResponse.notFound("日志不存在");
    }

    // 删除日志
    await prisma.aPILog.delete({
      where: { id: logId },
    });

    return ApiResponse.success({ message: "日志已删除" });
  } catch (error) {
    return handleApiError(error);
  }
}
