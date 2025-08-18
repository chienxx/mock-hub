import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { sseManager } from "@/lib/sse/global-manager";

/**
 * SSE端点 - 实时推送通知
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 创建SSE流
  const stream = new ReadableStream({
    start(controller) {
      const clientId = `notification-${session.user.id}-${Date.now()}`;

      // 添加客户端到管理器
      sseManager.addClient(clientId, controller, {
        userId: session.user.id,
      });

      // 处理客户端断开
      request.signal.addEventListener("abort", () => {
        sseManager.removeClient(clientId);
      });
    },
  });

  // 返回SSE响应
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // 禁用Nginx缓冲
    },
  });
}
