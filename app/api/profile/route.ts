import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1, "姓名不能为空").max(50, "姓名长度不能超过50个字符"),
});

/**
 * 获取当前用户资料
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return ApiResponse.notFound("用户不存在");
    }

    return ApiResponse.success(user);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * 更新当前用户资料
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
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

    return ApiResponse.success(updatedUser, "个人资料已更新");
  } catch (error) {
    return handleApiError(error);
  }
}
