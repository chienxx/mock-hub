import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import { UserRole, UserStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateUserSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  name: z.string().optional(),
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

    return ApiResponse.success(updatedUser, "用户信息已更新");
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 删除用户（仅管理员）
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    // 确保用户存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return ApiResponse.notFound("用户不存在");
    }

    // 删除用户（会级联删除相关数据）
    await prisma.user.delete({
      where: { id: userId },
    });

    return ApiResponse.success(null, "用户已删除");
  } catch (error) {
    return handleApiError(error);
  }
}
