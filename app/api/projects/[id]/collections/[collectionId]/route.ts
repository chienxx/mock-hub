import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCollectionSchema } from "@/lib/validations/mock";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";

interface RouteParams {
  params: Promise<{ id: string; collectionId: string }>;
}

// 获取单个分组详情
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, collectionId } = await params;

    // 检查项目权限
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.VIEWER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限访问此项目");
    }

    // 获取分组详情
    const collection = await prisma.collection.findFirst({
      where: {
        id: collectionId,
        projectId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        projectId: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        mockAPIs: {
          select: {
            id: true,
            path: true,
            method: true,
            name: true,
            enabled: true,
            responseStatus: true,
            createdAt: true,
          },
          orderBy: { path: "asc" },
        },
        _count: {
          select: {
            mockAPIs: true,
          },
        },
      },
    });

    if (!collection) {
      return ApiResponse.notFound("分组不存在");
    }

    return ApiResponse.success(collection);
  } catch (error) {
    return handleApiError(error);
  }
}

// 更新分组
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, collectionId } = await params;
    const body = await request.json();

    // 验证输入
    const validatedData = updateCollectionSchema.parse(body);

    // 检查项目权限 (需要开发者权限)
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限修改此分组");
    }

    // 检查分组是否存在
    const collection = await prisma.collection.findFirst({
      where: {
        id: collectionId,
        projectId,
      },
    });

    if (!collection) {
      return ApiResponse.notFound("分组不存在");
    }

    // 如果修改了名称，检查是否重复
    if (validatedData.name && validatedData.name !== collection.name) {
      const existingCollection = await prisma.collection.findFirst({
        where: {
          projectId,
          name: validatedData.name,
          parentId:
            validatedData.parentId !== undefined
              ? validatedData.parentId
              : collection.parentId,
          id: { not: collectionId },
        },
      });

      if (existingCollection) {
        return ApiResponse.badRequest("分组名称已存在");
      }
    }

    // 如果修改了父分组，检查父分组是否存在且不是自己
    if (validatedData.parentId !== undefined && validatedData.parentId) {
      if (validatedData.parentId === collectionId) {
        return ApiResponse.badRequest("不能将分组设置为自己的父分组");
      }

      const parentCollection = await prisma.collection.findFirst({
        where: {
          id: validatedData.parentId,
          projectId,
        },
      });

      if (!parentCollection) {
        return ApiResponse.badRequest("指定的父分组不存在");
      }

      // 检查是否会产生循环依赖
      let currentParent = parentCollection;
      while (currentParent) {
        if (currentParent.id === collectionId) {
          return ApiResponse.badRequest("不能创建循环依赖关系");
        }

        if (currentParent.parentId) {
          const nextParent = await prisma.collection.findUnique({
            where: { id: currentParent.parentId },
          });
          if (!nextParent) {
            break;
          }
          currentParent = nextParent;
        } else {
          break;
        }
      }
    }

    // 更新分组
    const updatedCollection = await prisma.collection.update({
      where: { id: collectionId },
      data: validatedData,
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

    return ApiResponse.success(updatedCollection, "分组更新成功");
  } catch (error) {
    return handleApiError(error);
  }
}

// 删除分组
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, collectionId } = await params;

    // 检查项目权限 (需要开发者权限)
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限删除此分组");
    }

    // 检查分组是否存在
    const collection = await prisma.collection.findFirst({
      where: {
        id: collectionId,
        projectId,
      },
      include: {
        _count: {
          select: {
            mockAPIs: true,
          },
        },
      },
    });

    if (!collection) {
      return ApiResponse.notFound("分组不存在");
    }

    // 检查是否有子分组
    const childCollections = await prisma.collection.findMany({
      where: {
        parentId: collectionId,
        projectId,
      },
    });

    if (childCollections.length > 0) {
      return ApiResponse.badRequest("请先删除子分组");
    }

    // 删除分组前，将其下的 Mock API 移动到未分组
    if (collection._count.mockAPIs > 0) {
      await prisma.mockAPI.updateMany({
        where: { collectionId },
        data: { collectionId: null },
      });
    }

    // 删除分组
    await prisma.collection.delete({
      where: { id: collectionId },
    });

    return ApiResponse.success(null, "分组删除成功");
  } catch (error) {
    return handleApiError(error);
  }
}
