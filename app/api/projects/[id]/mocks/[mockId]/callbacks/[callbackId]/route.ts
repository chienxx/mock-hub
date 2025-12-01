import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole, Prisma, CallbackMethod } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string; mockId: string; callbackId: string }>;
}

// 更新回调验证schema
const updateCallbackSchema = z.object({
  name: z.string().optional(),
  url: z.string().url("请输入有效的URL").optional(),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
  delay: z.number().int().min(0).max(60000).optional(),
  enabled: z.boolean().optional(),
});

// 获取单个回调详情
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId, callbackId } = await params;

    // 检查项目权限
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.VIEWER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限访问此项目");
    }

    // 获取回调配置
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

    return ApiResponse.success(callback);
  } catch (error) {
    return handleApiError(error);
  }
}

// 更新回调
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId, callbackId } = await params;
    const body = await request.json();

    // 验证输入
    const validatedData = updateCallbackSchema.parse(body);

    // 检查项目权限（需要开发者权限）
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限更新回调");
    }

    // 检查回调是否存在
    const existingCallback = await prisma.mockCallback.findFirst({
      where: {
        id: callbackId,
        mockApiId: mockId,
        mockApi: {
          projectId,
        },
      },
    });

    if (!existingCallback) {
      return ApiResponse.notFound("回调不存在");
    }

    // 更新回调
    const callback = await prisma.mockCallback.update({
      where: { id: callbackId },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.url !== undefined && { url: validatedData.url }),
        ...(validatedData.method !== undefined && {
          method: validatedData.method as CallbackMethod,
        }),
        ...(validatedData.headers !== undefined && {
          headers: validatedData.headers as Prisma.InputJsonValue,
        }),
        ...(validatedData.body !== undefined && {
          body: validatedData.body as Prisma.InputJsonValue,
        }),
        ...(validatedData.delay !== undefined && { delay: validatedData.delay }),
        ...(validatedData.enabled !== undefined && {
          enabled: validatedData.enabled,
        }),
      },
    });

    return ApiResponse.success(callback, "回调更新成功");
  } catch (error) {
    return handleApiError(error);
  }
}

// 删除回调
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId, callbackId } = await params;

    // 检查项目权限（需要开发者权限）
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限删除回调");
    }

    // 检查回调是否存在
    const existingCallback = await prisma.mockCallback.findFirst({
      where: {
        id: callbackId,
        mockApiId: mockId,
        mockApi: {
          projectId,
        },
      },
    });

    if (!existingCallback) {
      return ApiResponse.notFound("回调不存在");
    }

    // 删除回调
    await prisma.mockCallback.delete({
      where: { id: callbackId },
    });

    return ApiResponse.success(null, "回调删除成功");
  } catch (error) {
    return handleApiError(error);
  }
}
