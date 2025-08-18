import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateMockAPISchema } from "@/lib/validations/mock";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";
import {
  notifyProjectMembers,
  createNotification,
} from "@/lib/api/notification-helper";
import { clearMockCache } from "@/lib/mock/matcher";

interface RouteParams {
  params: Promise<{ id: string; mockId: string }>;
}

// 获取单个 Mock API 详情
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

    // 获取 Mock API
    const mockAPI = await prisma.mockAPI.findFirst({
      where: {
        id: mockId,
        projectId: project.id,
      },
      include: {
        collection: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        rules: {
          orderBy: { priority: "desc" },
        },
        _count: {
          select: {
            rules: true,
            logs: true,
          },
        },
      },
    });

    if (!mockAPI) {
      return ApiResponse.notFound("Mock API 不存在");
    }

    return ApiResponse.success(mockAPI);
  } catch (error) {
    return handleApiError(error);
  }
}

// 更新 Mock API
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId, mockId } = await params;
    const body = await request.json();

    // 验证输入
    const validatedData = updateMockAPISchema.parse(body);

    // 查找项目
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return ApiResponse.notFound("项目不存在");
    }

    // 检查项目权限 (需要开发者权限)
    const hasPermission = await checkProjectPermission(
      project.id,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限修改此 Mock API");
    }

    // 检查 Mock API 是否存在
    const mockAPI = await prisma.mockAPI.findFirst({
      where: {
        id: mockId,
        projectId: project.id,
      },
    });

    if (!mockAPI) {
      return ApiResponse.notFound("Mock API 不存在");
    }

    // 如果修改了分组，检查分组是否存在且属于该项目
    if (validatedData.collectionId !== undefined) {
      if (validatedData.collectionId) {
        const collection = await prisma.collection.findFirst({
          where: {
            id: validatedData.collectionId,
            projectId: project.id,
          },
        });

        if (!collection) {
          return ApiResponse.badRequest("指定的分组不存在");
        }
      }
    }

    // 更新 Mock API
    const updatedMockAPI = await prisma.mockAPI.update({
      where: { id: mockId },
      data: validatedData,
      include: {
        collection: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        rules: {
          orderBy: { priority: "desc" },
        },
        _count: {
          select: {
            rules: true,
            logs: true,
          },
        },
      },
    });

    // 清除缓存，确保下次请求使用最新数据
    await clearMockCache(project.id, mockAPI.path, mockAPI.method);

    // 如果修改者不是创建者，通知创建者
    if (mockAPI.creatorId !== session.user.id) {
      await createNotification({
        userId: mockAPI.creatorId,
        type: "MOCK",
        title: "Mock API 被修改",
        content: `${session.user.name || session.user.email} 修改了您创建的 Mock API: ${updatedMockAPI.method} ${updatedMockAPI.path}`,
        metadata: {
          projectId: project.id,
          mockApiId: mockAPI.id,
          mockApiName: updatedMockAPI.name,
          method: updatedMockAPI.method,
          path: updatedMockAPI.path,
          modifiedBy: session.user.name || session.user.email,
          action: "MOCK_UPDATED",
        },
      });
    }

    // 通知项目成员
    await notifyProjectMembers(
      project.id,
      {
        title: "Mock API 更新",
        content: `${session.user.name || session.user.email} 更新了 Mock API: ${updatedMockAPI.method} ${updatedMockAPI.path}`,
        metadata: {
          projectId: project.id,
          mockApiId: mockAPI.id,
          mockApiName: updatedMockAPI.name,
          method: updatedMockAPI.method,
          path: updatedMockAPI.path,
          modifiedBy: session.user.name || session.user.email,
          action: "MOCK_UPDATED",
        },
      },
      session.user.id, // 排除修改者自己
    );

    return ApiResponse.success(updatedMockAPI, "Mock API 更新成功");
  } catch (error) {
    return handleApiError(error);
  }
}

// 删除 Mock API
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    // 检查项目权限 (需要开发者权限)
    const hasPermission = await checkProjectPermission(
      project.id,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限删除此 Mock API");
    }

    // 检查 Mock API 是否存在
    const mockAPI = await prisma.mockAPI.findFirst({
      where: {
        id: mockId,
        projectId: project.id,
      },
    });

    if (!mockAPI) {
      return ApiResponse.notFound("Mock API 不存在");
    }

    // 删除 Mock API (会级联删除相关的规则和日志)
    await prisma.mockAPI.delete({
      where: { id: mockId },
    });

    // 清除缓存
    await clearMockCache(project.id, mockAPI.path, mockAPI.method);

    // 通知项目成员
    await notifyProjectMembers(
      project.id,
      {
        title: "Mock API 删除",
        content: `${session.user.name || session.user.email} 删除了 Mock API: ${mockAPI.method} ${mockAPI.path}`,
        metadata: {
          projectId: project.id,
          mockApiId: mockAPI.id,
          mockApiName: mockAPI.name,
          method: mockAPI.method,
          path: mockAPI.path,
          deletedBy: session.user.name || session.user.email,
          action: "MOCK_DELETED",
        },
      },
      session.user.id, // 排除删除者自己
    );

    return ApiResponse.success(null, "Mock API 删除成功");
  } catch (error) {
    return handleApiError(error);
  }
}
