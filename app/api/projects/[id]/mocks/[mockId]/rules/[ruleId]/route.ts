import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateMockRuleSchema } from "@/lib/validations/rule";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole, Prisma } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";

interface RouteParams {
  params: Promise<{ id: string; mockId: string; ruleId: string }>;
}

// 获取单个规则详情
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId, ruleId } = await params;

    // 检查项目权限
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.VIEWER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限访问此项目");
    }

    // 获取规则
    const rule = await prisma.mockRule.findFirst({
      where: {
        id: ruleId,
        mockApiId: mockId,
        mockApi: { projectId },
      },
    });

    if (!rule) {
      return ApiResponse.notFound("规则不存在");
    }

    return ApiResponse.success(rule);
  } catch (error) {
    return handleApiError(error);
  }
}

// 更新规则
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId, ruleId } = await params;
    const body = await request.json();

    // 验证输入
    const validatedData = updateMockRuleSchema.parse(body);

    // 检查项目权限（需要开发者权限）
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限更新规则");
    }

    // 检查规则是否存在
    const existingRule = await prisma.mockRule.findFirst({
      where: {
        id: ruleId,
        mockApiId: mockId,
        mockApi: { projectId },
      },
    });

    if (!existingRule) {
      return ApiResponse.notFound("规则不存在");
    }

    // 更新规则
    const updatedRule = await prisma.mockRule.update({
      where: { id: ruleId },
      data: {
        ...validatedData,
        conditions: validatedData.conditions as Prisma.InputJsonValue,
        headers: validatedData.headers as Prisma.InputJsonValue,
        body: validatedData.body as Prisma.InputJsonValue,
      },
    });

    return ApiResponse.success(updatedRule, "规则更新成功");
  } catch (error) {
    return handleApiError(error);
  }
}

// 删除规则
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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
      return ApiResponse.forbidden("没有权限删除规则");
    }

    // 检查规则是否存在
    const rule = await prisma.mockRule.findFirst({
      where: {
        id: ruleId,
        mockApiId: mockId,
        mockApi: { projectId },
      },
    });

    if (!rule) {
      return ApiResponse.notFound("规则不存在");
    }

    // 删除规则
    await prisma.mockRule.delete({
      where: { id: ruleId },
    });

    return ApiResponse.success(null, "规则删除成功");
  } catch (error) {
    return handleApiError(error);
  }
}
