/**
 * 全局SSE管理器 - 使用单例模式确保在热重载时保持连接
 */

// 在开发环境中，使用global对象来保持SSE管理器实例
declare global {
  var __sseManager: SSEManager | undefined;
}

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
  projectId?: string;
  userId?: string;
  mockApiId?: string;
  createdAt: Date;
};

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  addClient(
    clientId: string,
    controller: ReadableStreamDefaultController,
    filters?: {
      projectId?: string;
      userId?: string;
      mockApiId?: string;
    },
  ) {
    const client: SSEClient = {
      id: clientId,
      controller,
      createdAt: new Date(),
      ...filters,
    };

    this.clients.set(clientId, client);
  }

  removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.controller.close();
      } catch {
        // 客户端可能已经断开
      }
      this.clients.delete(clientId);
    }
  }

  broadcast(
    data: unknown,
    filters?: {
      projectId?: string;
      userId?: string;
      mockApiId?: string;
    },
  ) {
    this.clients.forEach((client) => {
      // 检查过滤条件
      if (filters) {
        if (filters.projectId && client.projectId !== filters.projectId) return;
        if (filters.userId && client.userId !== filters.userId) return;
        if (filters.mockApiId && client.mockApiId !== filters.mockApiId) return;
      }

      try {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        const encoder = new TextEncoder();
        client.controller.enqueue(encoder.encode(message));
      } catch {
        this.removeClient(client.id);
      }
    });
  }

  getAllClients() {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      projectId: client.projectId,
      userId: client.userId,
      mockApiId: client.mockApiId,
      createdAt: client.createdAt,
    }));
  }

  getClientCount() {
    return this.clients.size;
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const heartbeat = {
        type: "heartbeat",
        timestamp: new Date().toISOString(),
      };

      this.clients.forEach((client) => {
        try {
          const message = `data: ${JSON.stringify(heartbeat)}\n\n`;
          const encoder = new TextEncoder();
          client.controller.enqueue(encoder.encode(message));
        } catch {
          // 如果发送失败，客户端可能已断开
          this.removeClient(client.id);
        }
      });
    }, 30000); // 每30秒发送心跳
  }

  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.clients.forEach((client) => {
      this.removeClient(client.id);
    });
  }
}

// 在开发环境中使用全局变量保持实例
let sseManager: SSEManager;

if (process.env.NODE_ENV === "production") {
  sseManager = new SSEManager();
} else {
  // 开发环境：使用全局变量避免热重载时丢失连接
  if (!global.__sseManager) {
    global.__sseManager = new SSEManager();
  }
  sseManager = global.__sseManager;
}

export { sseManager };
