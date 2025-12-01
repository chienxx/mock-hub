import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole, Prisma, CallbackMethod } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string; mockId: string }>;
}

// 回调配置验证schema
const createCallbackSchema = z.object({
  name: z.string().optional(),
  url: z.string().url("请输入有效的URL"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("POST"),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
  delay: z.number().int().min(0).max(60000).default(0),
  enabled: z.boolean().default(true),
});

// 获取Mock API的回调列表
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

    // 获取回调列表，按执行顺序排序
    const callbacks = await prisma.mockCallback.findMany({
      where: { mockApiId: mockId },
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" },
      ],
    });

    return ApiResponse.success(callbacks);
  } catch (error) {
    return handleApiError(error);
  }
}

// 创建新回调
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId } = await params;
    const body = await request.json();

    // 验证输入
    const validatedData = createCallbackSchema.parse(body);

    // 检查项目权限（需要开发者权限）
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限创建回调");
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

    // 检查回调数量限制
    const callbackCount = await prisma.mockCallback.count({
      where: { mockApiId: mockId },
    });

    if (callbackCount >= 10) {
      return ApiResponse.badRequest("回调数量已达上限（最多10个）");
    }

    // 自动分配执行顺序：获取当前最大顺序+1
    const lastCallback = await prisma.mockCallback.findFirst({
      where: { mockApiId: mockId },
      orderBy: { order: "desc" },
    });
    const order = (lastCallback?.order || 0) + 1;

    // 创建回调
    const callback = await prisma.mockCallback.create({
      data: {
        mockApiId: mockId,
        name: validatedData.name,
        url: validatedData.url,
        method: validatedData.method as CallbackMethod,
        headers: validatedData.headers as Prisma.InputJsonValue,
        body: validatedData.body as Prisma.InputJsonValue,
        delay: validatedData.delay,
        enabled: validatedData.enabled,
        order,
      },
    });

    return ApiResponse.success(callback, "回调创建成功");
  } catch (error) {
    return handleApiError(error);
  }
}

// 批量更新回调执行顺序（用于拖拽排序）
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
      return ApiResponse.forbidden("没有权限更新回调顺序");
    }

    // 验证回调都属于这个Mock API
    const callbackIds = body.callbacks.map((c: { id: string }) => c.id);
    const existingCallbacks = await prisma.mockCallback.findMany({
      where: {
        id: { in: callbackIds },
        mockApiId: mockId,
      },
    });

    if (existingCallbacks.length !== callbackIds.length) {
      return ApiResponse.badRequest("存在无效的回调ID");
    }

    // 批量更新执行顺序
    const updates = body.callbacks.map(
      (callback: { id: string; order: number }) =>
        prisma.mockCallback.update({
          where: { id: callback.id },
          data: { order: callback.order },
        }),
    );

    await prisma.$transaction(updates);

    return ApiResponse.success(null, "回调顺序更新成功");
  } catch (error) {
    return handleApiError(error);
  }
}
