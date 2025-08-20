import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/api/response";
import type { Session } from "next-auth";

/**
 * 检查用户状态，确保用户账户是活跃的
 * @param session 用户会话
 * @returns 如果用户被封禁或未激活，返回错误响应；否则返回 null
 */
export async function checkUserStatus(session: Session | null) {
  if (!session?.user?.id) {
    return ApiResponse.unauthorized("请先登录");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { status: true },
    });

    if (!user) {
      return ApiResponse.notFound("用户不存在");
    }

    if (user.status === "BANNED") {
      return ApiResponse.forbidden("您的账户已被封禁，请联系管理员");
    }

    // 如果用户状态正常，返回 null（表示通过检查）
    return null;
  } catch (error) {
    console.error("检查用户状态失败:", error);
    // 在出错时不阻止用户访问，但记录错误
    return null;
  }
}
