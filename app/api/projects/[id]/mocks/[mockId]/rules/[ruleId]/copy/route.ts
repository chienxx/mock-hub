import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole, Prisma } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";

interface RouteParams {
  params: Promise<{ id: string; mockId: string; ruleId: string }>;
}

// 复制规则
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId, ruleId } = await params;

    // 检查项目权限（需要开发者权限）
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限复制规则");
    }

    // 获取原规则
    const originalRule = await prisma.mockRule.findFirst({
      where: {
        id: ruleId,
        mockApiId: mockId,
        mockApi: { projectId },
      },
    });

    if (!originalRule) {
      return ApiResponse.notFound("规则不存在");
    }

    // 检查规则数量限制
    const ruleCount = await prisma.mockRule.count({
      where: { mockApiId: mockId },
    });

    if (ruleCount >= 5) {
      return ApiResponse.badRequest("规则数量已达上限（最多5条）");
    }

    // 获取当前最大优先级
    const lastRule = await prisma.mockRule.findFirst({
      where: { mockApiId: mockId },
      orderBy: { priority: "desc" },
    });
    const newPriority = (lastRule?.priority || 0) + 10;

    // 创建规则副本
    const newRule = await prisma.mockRule.create({
      data: {
        mockApiId: originalRule.mockApiId,
        name: originalRule.name ? `${originalRule.name} (副本)` : "规则副本",
        priority: newPriority,
        enabled: false, // 默认禁用副本
        conditions: originalRule.conditions as Prisma.InputJsonValue,
        statusCode: originalRule.statusCode,
        headers: originalRule.headers as Prisma.InputJsonValue,
        body: originalRule.body as Prisma.InputJsonValue,
        delay: originalRule.delay,
      },
    });

    return ApiResponse.success(newRule, "规则复制成功");
  } catch (error) {
    return handleApiError(error);
  }
}
