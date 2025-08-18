import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 批量操作schema
const batchOperationSchema = z.object({
  mockApiIds: z.array(z.string()).min(1, "请至少选择一个Mock API"),
  operation: z.enum(["enable", "disable", "delete", "move"]),
  collectionId: z.string().optional(), // 移动到分组时需要
});

/**
 * 批量操作Mock API
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId } = await params;
    const body = await request.json();

    // 验证输入
    const validatedData = batchOperationSchema.parse(body);
    const { mockApiIds, operation, collectionId } = validatedData;

    // 检查项目权限 (需要开发者权限)
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限执行批量操作");
    }

    // 验证所有Mock API都属于该项目
    const mockApis = await prisma.mockAPI.findMany({
      where: {
        id: { in: mockApiIds },
        projectId,
      },
    });

    if (mockApis.length !== mockApiIds.length) {
      return ApiResponse.badRequest("部分Mock API不存在或不属于该项目");
    }

    // 执行批量操作
    switch (operation) {
      case "enable":
        await prisma.mockAPI.updateMany({
          where: {
            id: { in: mockApiIds },
            projectId,
          },
          data: { enabled: true },
        });
        return ApiResponse.success(
          {
            affected: mockApiIds.length,
          },
          `已启用 ${mockApiIds.length} 个Mock API`,
        );

      case "disable":
        await prisma.mockAPI.updateMany({
          where: {
            id: { in: mockApiIds },
            projectId,
          },
          data: { enabled: false },
        });
        return ApiResponse.success(
          {
            affected: mockApiIds.length,
          },
          `已禁用 ${mockApiIds.length} 个Mock API`,
        );

      case "delete":
        // 批量删除（会级联删除相关的规则和日志）
        const deleteResult = await prisma.mockAPI.deleteMany({
          where: {
            id: { in: mockApiIds },
            projectId,
          },
        });
        return ApiResponse.success(
          {
            affected: deleteResult.count,
          },
          `已删除 ${deleteResult.count} 个Mock API`,
        );

      case "move":
        if (!collectionId) {
          return ApiResponse.badRequest("移动操作需要指定目标分组");
        }

        // 验证分组是否存在且属于该项目
        if (collectionId !== "none") {
          const collection = await prisma.collection.findFirst({
            where: {
              id: collectionId,
              projectId,
            },
          });

          if (!collection) {
            return ApiResponse.badRequest("目标分组不存在");
          }
        }

        // 批量移动到分组
        await prisma.mockAPI.updateMany({
          where: {
            id: { in: mockApiIds },
            projectId,
          },
          data: {
            collectionId: collectionId === "none" ? null : collectionId,
          },
        });
        return ApiResponse.success(
          {
            affected: mockApiIds.length,
          },
          `已移动 ${mockApiIds.length} 个Mock API`,
        );

      default:
        return ApiResponse.badRequest("无效的操作类型");
    }
  } catch (error) {
    return handleApiError(error);
  }
}
