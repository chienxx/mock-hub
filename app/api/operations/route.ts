import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { OperationType } from "@prisma/client";

/**
 * 获取操作日志列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    // 只有管理员可以查看所有日志，普通用户只能查看自己的
    const isAdmin = session.user.role === "ADMIN";

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const userId = searchParams.get("userId");
    const type = searchParams.get("type") as OperationType | null;
    const operationModule = searchParams.get("module");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    // 构建查询条件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // 普通用户只能看自己的日志
    if (!isAdmin) {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (type) {
      where.type = type;
    }

    if (operationModule) {
      where.module = operationModule;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { action: { contains: search } },
        { targetName: { contains: search } },
        { errorMessage: { contains: search } },
      ];
    }

    // 查询总数
    const total = await prisma.operationLog.count({ where });

    // 查询列表
    const logs = await prisma.operationLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return ApiResponse.success({
      logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 导出操作日志
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const body = await request.json();
    const { startDate, endDate, type, module: operationModule, userId } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // 普通用户只能导出自己的日志
    if (session.user.role !== "ADMIN") {
      where.userId = session.user.id;
    } else if (userId) {
      // 管理员可以指定用户ID
      where.userId = userId;
    }

    if (type) where.type = type;
    if (operationModule) where.module = operationModule;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const logs = await prisma.operationLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10000, // 最多导出10000条
    });

    return ApiResponse.success({ logs });
  } catch (error) {
    return handleApiError(error);
  }
}
