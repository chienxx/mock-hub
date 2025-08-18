import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import bcrypt from "bcryptjs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 重置用户密码（仅管理员）
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    // 仅管理员可以重置密码
    if (session.user.role !== "ADMIN") {
      return ApiResponse.forbidden("没有权限");
    }

    const { id: userId } = await params;

    // 确保用户存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return ApiResponse.notFound("用户不存在");
    }

    // 生成临时密码（8位随机字符）
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 更新用户密码
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        // 可以添加一个字段标记需要修改密码
        // needPasswordChange: true
      },
    });

    return ApiResponse.success(
      { tempPassword },
      "密码已重置，请告知用户新密码",
    );
  } catch (error) {
    return handleApiError(error);
  }
}
