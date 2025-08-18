import { prisma } from "@/lib/prisma";
import { sseManager } from "@/lib/sse/global-manager";
import { NotificationType, Prisma } from "@prisma/client";

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: unknown;
}

/**
 * 创建通知并通过SSE推送
 */
export async function createNotification(data: CreateNotificationData) {
  try {
    // 创建通知记录
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        content: data.content,
        metadata: data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : undefined,
      },
    });

    // 通过SSE推送通知
    sseManager.broadcast(
      {
        type: "notification",
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          content: data.content,
          metadata: data.metadata,
        },
      },
      { userId: data.userId },
    );

    return notification;
  } catch (error) {
    // 重新抛出错误以便上层处理
    throw error;
  }
}

/**
 * 批量创建通知
 */
export async function createBatchNotifications(
  userIds: string[],
  notification: Omit<CreateNotificationData, "userId">,
) {
  const promises = userIds.map((userId) =>
    createNotification({ ...notification, userId }),
  );

  return Promise.all(promises);
}

/**
 * 创建项目相关通知
 */
export async function notifyProjectMembers(
  projectId: string,
  notification: Omit<CreateNotificationData, "userId" | "type">,
  excludeUserId?: string,
) {
  // 获取项目所有成员
  const members = await prisma.projectMember.findMany({
    where: {
      projectId,
      ...(excludeUserId && { userId: { not: excludeUserId } }),
    },
    select: { userId: true },
  });

  const userIds = members.map((m) => m.userId);

  return createBatchNotifications(userIds, {
    ...notification,
    type: NotificationType.PROJECT,
  });
}

/**
 * 创建API错误通知
 */
export async function notifyApiError(
  mockApiId: string,
  errorDetails: {
    method: string;
    path: string;
    statusCode: number;
    errorMessage: string;
  },
) {
  // 获取Mock API信息
  const mockApi = await prisma.mockAPI.findUnique({
    where: { id: mockApiId },
    include: {
      project: {
        include: {
          members: {
            where: {
              role: { in: ["MANAGER", "DEVELOPER"] },
            },
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!mockApi) return;

  const userIds = mockApi.project.members.map((m) => m.userId);

  return createBatchNotifications(userIds, {
    type: NotificationType.API_ERROR,
    title: `API 调用错误: ${errorDetails.statusCode}`,
    content: `${errorDetails.method} ${errorDetails.path} 返回错误: ${errorDetails.errorMessage}`,
    metadata: {
      mockApiId,
      projectId: mockApi.projectId,
      ...errorDetails,
    },
  });
}

/**
 * 创建系统通知
 */
export async function createSystemNotification(
  title: string,
  content: string,
  targetUserIds?: string[],
) {
  if (targetUserIds && targetUserIds.length > 0) {
    // 发送给指定用户
    return createBatchNotifications(targetUserIds, {
      type: NotificationType.SYSTEM,
      title,
      content,
    });
  } else {
    // 发送给所有用户
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);

    return createBatchNotifications(userIds, {
      type: NotificationType.SYSTEM,
      title,
      content,
    });
  }
}
