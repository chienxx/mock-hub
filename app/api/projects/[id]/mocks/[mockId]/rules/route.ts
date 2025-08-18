import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMockRuleSchema } from "@/lib/validations/rule";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole, Prisma } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";

interface RouteParams {
  params: Promise<{ id: string; mockId: string }>;
}

// 获取Mock API的规则列表
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId } = await params;

    // 查找项目
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return ApiResponse.notFound("项目不存在");
    }

    // 检查项目权限
    const hasPermission = await checkProjectPermission(
      project.id,
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
        projectId: project.id,
      },
    });

    if (!mockApi) {
      return ApiResponse.notFound("Mock API不存在");
    }

    // 获取规则列表，按优先级排序
    const rules = await prisma.mockRule.findMany({
      where: { mockApiId: mockId },
      orderBy: [
        { priority: "asc" }, // 优先级升序（数字小的在前）
        { createdAt: "desc" },
      ],
    });

    return ApiResponse.success(rules);
  } catch (error) {
    return handleApiError(error);
  }
}

// 创建新规则
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId } = await params;
    const body = await request.json();

    // 验证输入
    const validatedData = createMockRuleSchema.parse({
      ...body,
      mockApiId: mockId,
    });

    // 检查项目权限（需要开发者权限）
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限创建规则");
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

    // 检查规则数量限制
    const ruleCount = await prisma.mockRule.count({
      where: { mockApiId: mockId },
    });

    if (ruleCount >= 5) {
      return ApiResponse.badRequest("规则数量已达上限（最多5条）");
    }

    // 自动分配优先级：获取当前最大优先级+10
    const lastRule = await prisma.mockRule.findFirst({
      where: { mockApiId: mockId },
      orderBy: { priority: "desc" },
    });
    const priority = (lastRule?.priority || 0) + 10;

    // 创建规则
    const rule = await prisma.mockRule.create({
      data: {
        ...validatedData,
        priority,
        conditions: validatedData.conditions as Prisma.InputJsonValue,
        headers: validatedData.headers as Prisma.InputJsonValue,
        body: validatedData.body as Prisma.InputJsonValue,
      },
    });

    return ApiResponse.success(rule, "规则创建成功");
  } catch (error) {
    return handleApiError(error);
  }
}

// 批量更新规则优先级（用于拖拽排序）
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId } = await params;
    const body = await request.json();

    // 检查项目权限（需要开发者权限）
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限更新规则优先级");
    }

    // 验证规则都属于这个Mock API
    const ruleIds = body.rules.map((r: { id: string }) => r.id);
    const existingRules = await prisma.mockRule.findMany({
      where: {
        id: { in: ruleIds },
        mockApiId: mockId,
      },
    });

    if (existingRules.length !== ruleIds.length) {
      return ApiResponse.badRequest("存在无效的规则ID");
    }

    // 批量更新优先级
    const updates = body.rules.map((rule: { id: string; priority: number }) =>
      prisma.mockRule.update({
        where: { id: rule.id },
        data: { priority: rule.priority },
      }),
    );

    await prisma.$transaction(updates);

    return ApiResponse.success(null, "规则优先级更新成功");
  } catch (error) {
    return handleApiError(error);
  }
}
