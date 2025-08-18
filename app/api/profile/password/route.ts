import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";
import bcrypt from "bcryptjs";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z
    .string()
    .min(8, "新密码至少8位")
    .max(100, "密码长度不能超过100个字符"),
});

/**
 * 修改密码
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const body = await request.json();
    const validatedData = changePasswordSchema.parse(body);

    // 获取用户当前密码
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user || !user.password) {
      return ApiResponse.notFound("用户不存在");
    }

    // 验证当前密码
    const isValidPassword = await bcrypt.compare(
      validatedData.currentPassword,
      user.password,
    );

    if (!isValidPassword) {
      return ApiResponse.badRequest("当前密码错误");
    }

    // 检查新密码不能与当前密码相同
    if (validatedData.currentPassword === validatedData.newPassword) {
      return ApiResponse.badRequest("新密码不能与当前密码相同");
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);

    // 更新密码
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return ApiResponse.success(null, "密码修改成功");
  } catch (error) {
    return handleApiError(error);
  }
}
