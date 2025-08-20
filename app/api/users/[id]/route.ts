import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import { UserRole, OperationType } from "@prisma/client";
import { logOperation } from "@/lib/services/operation-log-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateUserSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.enum(["ACTIVE", "BANNED"] as const).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

/**
 * 更新用户信息（仅管理员）
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    // 仅管理员可以修改其他用户
    if (session.user.role !== "ADMIN") {
      return ApiResponse.forbidden("没有权限");
    }

    const { id: userId } = await params;
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // 不允许修改自己的角色
    if (userId === session.user.id && validatedData.role) {
      return ApiResponse.badRequest("不能修改自己的角色");
    }

    // 确保用户存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return ApiResponse.notFound("用户不存在");
    }

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validatedData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    // 异步记录操作日志（不阻塞响应）
    const determineOperationType = (): { type: OperationType; action: string } => {
      if (validatedData.status === "BANNED") {
        return { type: OperationType.USER_BAN, action: "封禁用户账号" };
      } else if (validatedData.status === "ACTIVE" && user.status === "BANNED") {
        return { type: OperationType.USER_BAN, action: "解封用户账号" };
      } else if (validatedData.role) {
        return { type: OperationType.USER_ROLE, action: `修改用户角色为 ${validatedData.role}` };
      }
      return { type: OperationType.OTHER, action: "更新用户信息" };
    };
    
    const { type, action } = determineOperationType();
    
    // 异步记录，不等待完成
    logOperation({
      userId: session.user.id,
      type,
      module: "user",
      action,
      targetId: userId,
      targetName: user.email,
      metadata: validatedData,
      status: "SUCCESS",
    }, request).catch(console.error);

    return ApiResponse.success(updatedUser, "用户信息已更新");
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 删除用户（仅管理员）
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    if (session.user.role !== "ADMIN") {
      return ApiResponse.forbidden("没有权限");
    }

    const { id: userId } = await params;

    // 不允许删除自己
    if (userId === session.user.id) {
      return ApiResponse.badRequest("不能删除自己的账户");
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        createdProjects: {
          select: { id: true, name: true },
        },
        projectMembers: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!user) {
      return ApiResponse.notFound("用户不存在");
    }

    // 检查是否是最后一个管理员
    if (user.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return ApiResponse.badRequest("不能删除最后一个管理员账户");
      }
    }

    // 使用事务删除用户及相关数据
    await prisma.$transaction(async (tx) => {
      // 1. 删除用户创建的项目（这会级联删除项目相关的所有数据）
      if (user.createdProjects.length > 0) {
        await tx.project.deleteMany({
          where: { creatorId: userId },
        });
      }

      // 2. 删除用户的项目成员关系
      await tx.projectMember.deleteMany({
        where: { userId: userId },
      });

      // 3. 删除用户的通知
      await tx.notification.deleteMany({
        where: { userId: userId },
      });

      // 4. 删除用户的 API 日志
      await tx.aPILog.deleteMany({
        where: { userId: userId },
      });

      // 5. 删除用户创建的 Mock API
      await tx.mockAPI.deleteMany({
        where: { creatorId: userId },
      });

      // 6. 最后删除用户
      await tx.user.delete({
        where: { id: userId },
      });
    });

    // 异步记录操作日志
    logOperation({
      userId: session.user.id,
      type: OperationType.USER_DELETE,
      module: "user",
      action: `删除用户账号及相关数据`,
      targetId: userId,
      targetName: user.email,
      metadata: {
        deletedProjects: user.createdProjects.length,
        removedFromProjects: user.projectMembers.length,
      },
      status: "SUCCESS",
    }, request).catch(console.error);

    return ApiResponse.success(
      {
        deletedUser: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        deletedProjects: user.createdProjects.length,
        removedFromProjects: user.projectMembers.length,
      },
      "用户及其相关数据已成功删除",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
