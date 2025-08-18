import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCollectionSchema } from "@/lib/validations/mock";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取项目的分组列表
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId } = await params;

    // 检查项目权限
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.VIEWER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限访问此项目");
    }

    // 获取分组列表，包括parentId字段
    const collections = await prisma.collection.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        parentId: true,
        projectId: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            mockAPIs: true,
          },
        },
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });

    return ApiResponse.success(collections);
  } catch (error) {
    return handleApiError(error);
  }
}

// 创建新分组
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId } = await params;
    const body = await request.json();

    // 验证输入
    const validatedData = createCollectionSchema.parse(body);

    // 检查项目权限 (需要开发者权限)
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限在此项目中创建分组");
    }

    // 检查分组名称是否重复
    const existingCollection = await prisma.collection.findFirst({
      where: {
        projectId,
        name: validatedData.name,
        parentId: validatedData.parentId || null,
      },
    });

    if (existingCollection) {
      return ApiResponse.badRequest("分组名称已存在");
    }

    // 如果指定了父分组，检查父分组是否存在
    if (validatedData.parentId) {
      const parentCollection = await prisma.collection.findFirst({
        where: {
          id: validatedData.parentId,
          projectId,
        },
      });

      if (!parentCollection) {
        return ApiResponse.badRequest("指定的父分组不存在");
      }
    }

    // 获取当前分组的最大排序值
    const maxOrderCollection = await prisma.collection.findFirst({
      where: {
        projectId,
        parentId: validatedData.parentId || null,
      },
      orderBy: { order: "desc" },
    });

    const nextOrder = (maxOrderCollection?.order || 0) + 1;

    // 创建分组
    const collection = await prisma.collection.create({
      data: {
        ...validatedData,
        projectId,
        order: nextOrder,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        projectId: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            mockAPIs: true,
          },
        },
      },
    });

    return ApiResponse.success(collection, "分组创建成功");
  } catch (error) {
    return handleApiError(error);
  }
}
