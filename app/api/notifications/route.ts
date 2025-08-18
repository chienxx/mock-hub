import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";

/**
 * 获取当前用户的通知列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const isRead = searchParams.get("isRead");

    const where = {
      userId: session.user.id,
      ...(isRead !== null && { isRead: isRead === "true" }),
    };

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // 获取未读数量
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });

    return ApiResponse.success({
      notifications,
      total,
      unreadCount,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 标记通知为已读
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      // 标记所有为已读
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: { isRead: true },
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // 标记指定通知为已读
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id,
        },
        data: { isRead: true },
      });
    } else {
      return ApiResponse.badRequest("请提供要标记的通知ID");
    }

    return ApiResponse.success(null, "通知已标记为已读");
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 删除通知
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const searchParams = request.nextUrl.searchParams;
    const notificationId = searchParams.get("id");
    const deleteAll = searchParams.get("all") === "true";

    if (deleteAll) {
      // 删除所有已读通知
      await prisma.notification.deleteMany({
        where: {
          userId: session.user.id,
          isRead: true,
        },
      });
    } else if (notificationId) {
      // 删除指定通知
      await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId: session.user.id,
        },
      });
    } else {
      return ApiResponse.badRequest("请提供要删除的通知ID");
    }

    return ApiResponse.success(null, "通知已删除");
  } catch (error) {
    return handleApiError(error);
  }
}
