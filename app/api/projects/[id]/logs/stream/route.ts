import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sseManager } from "@/lib/sse/global-manager";
import { checkProjectPermission } from "@/lib/api/project-helpers";
import { ProjectRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * SSE端点 - 实时推送日志
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: projectId } = await params;

  const searchParams = request.nextUrl.searchParams;
  const mockApiId = searchParams.get("mockApiId");

  // 检查项目权限
  const hasPermission = await checkProjectPermission(
    projectId,
    session.user.id,
    ProjectRole.VIEWER,
  );

  if (!hasPermission) {
    return new Response("Forbidden", { status: 403 });
  }

  // 如果指定了mockApiId，验证它属于该项目
  if (mockApiId) {
    const mockApi = await prisma.mockAPI.findFirst({
      where: {
        id: mockApiId,
        projectId,
      },
    });

    if (!mockApi) {
      return new Response("Mock API not found", { status: 404 });
    }
  }

  // 创建SSE流
  const clientId = `${session.user.id}-${Date.now()}`;

  // 标记客户端是否已经被添加
  let clientAdded = false;

  // 创建流
  const stream = new ReadableStream({
    async start(controller) {
      // 立即添加客户端到管理器
      const filters = {
        projectId,
        userId: session.user.id,
        mockApiId: mockApiId || undefined,
      };
      sseManager.addClient(clientId, controller, filters);
      clientAdded = true;

      // 立即发送connected消息
      const encoder = new TextEncoder();
      const connectedMessage = `data: ${JSON.stringify({
        type: "connected",
        data: {
          clientId,
          timestamp: new Date().toISOString(),
          projectId,
        },
      })}\n\n`;

      controller.enqueue(encoder.encode(connectedMessage));

      // 发送一个初始的ping来确保连接建立
      const pingMessage = `data: ${JSON.stringify({
        type: "ping",
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(pingMessage));

      // 延迟注册abort监听器，避免过早触发
      setTimeout(() => {
        // 处理客户端断开
        request.signal.addEventListener("abort", () => {
          if (clientAdded) {
            sseManager.removeClient(clientId);
            clientAdded = false;
          }
        });
      }, 100);
    },
    cancel() {
      // 当流被取消时清理
      if (clientAdded) {
        sseManager.removeClient(clientId);
        clientAdded = false;
      }
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
