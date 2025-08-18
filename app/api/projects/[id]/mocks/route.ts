import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMockAPISchema } from "@/lib/validations/mock";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole } from "@prisma/client";
import { checkProjectPermission } from "@/lib/api/project-helpers";
import { notifyProjectMembers } from "@/lib/api/notification-helper";
import { clearMockCache } from "@/lib/mock/matcher";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取项目的 Mock API 列表
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId } = await params;
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const method = searchParams.get("method") || "";
    const collection = searchParams.get("collection") || "";
    const enabled = searchParams.get("enabled") || "";

    // 检查项目权限
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.VIEWER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限访问此项目");
    }

    // 构建查询条件
    const where: Record<string, unknown> = {
      projectId,
      ...(search && {
        OR: [
          { path: { contains: search } },
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      }),
      ...(method && { method }),
      ...(enabled !== "" && { enabled: enabled === "true" }),
    };

    // 分组筛选
    if (collection) {
      if (collection === "NONE") {
        where.collectionId = null;
      } else {
        where.collectionId = collection;
      }
    }

    // 获取总数
    const total = await prisma.mockAPI.count({ where });

    // 获取列表
    const mockAPIs = await prisma.mockAPI.findMany({
      where,
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
        _count: {
          select: {
            rules: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return ApiResponse.success({
      items: mockAPIs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// 创建新的 Mock API
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId } = await params;
    const body = await request.json();

    // 验证输入
    const validatedData = createMockAPISchema.parse(body);

    // 检查项目权限 (需要开发者权限才能创建)
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.DEVELOPER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限在此项目中创建 Mock API");
    }

    // 检查路径和方法的唯一性
    const existingMock = await prisma.mockAPI.findFirst({
      where: {
        projectId,
        path: validatedData.path,
        method: validatedData.method,
      },
    });

    if (existingMock) {
      return ApiResponse.badRequest(
        `${validatedData.method} ${validatedData.path} 已存在`,
      );
    }

    // 如果指定了分组，检查分组是否存在且属于该项目
    if (validatedData.collectionId) {
      const collection = await prisma.collection.findFirst({
        where: {
          id: validatedData.collectionId,
          projectId,
        },
      });

      if (!collection) {
        return ApiResponse.badRequest("指定的分组不存在");
      }
    }

    // 创建 Mock API
    const mockAPI = await prisma.mockAPI.create({
      data: {
        ...validatedData,
        projectId,
        creatorId: session.user.id,
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
        _count: {
          select: {
            rules: true,
          },
        },
      },
    });

    // 清除可能存在的缓存（防止缓存不一致）
    await clearMockCache(projectId, mockAPI.path, mockAPI.method);

    // 发送通知给项目成员
    await notifyProjectMembers(
      projectId,
      {
        title: "新 Mock API 创建",
        content: `${session.user.name || session.user.email} 创建了新的 Mock API: ${mockAPI.method} ${mockAPI.path}`,
        metadata: {
          projectId,
          mockApiId: mockAPI.id,
          mockApiName: mockAPI.name,
          method: mockAPI.method,
          path: mockAPI.path,
          createdBy: session.user.name || session.user.email,
          action: "MOCK_CREATED",
        },
      },
      session.user.id, // 排除创建者自己
    );

    return ApiResponse.success(mockAPI, "Mock API 创建成功");
  } catch (error) {
    return handleApiError(error);
  }
}
