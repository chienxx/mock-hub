import { redis } from "@/lib/redis";

export class CacheManager {
  // 缓存键前缀
  private static readonly PREFIX = "mock-hub:";

  // TTL 配置（秒）
  static readonly TTL = {
    MOCK_DATA: 5 * 60, // Mock 数据缓存 5 分钟
    USER_SESSION: 24 * 60 * 60, // 用户 Session 24 小时
    API_STATS: 60, // API 统计 1 分钟
    PROJECT_INFO: 10 * 60, // 项目信息 10 分钟
    DEFAULT: 5 * 60, // 默认 5 分钟
  };

  // 生成缓存键
  private static getKey(namespace: string, ...parts: string[]): string {
    return `${this.PREFIX}${namespace}:${parts.join(":")}`;
  }

  // 设置缓存
  static async set<T>(
    namespace: string,
    key: string | string[],
    value: T,
    ttl?: number,
  ): Promise<void> {
    const cacheKey = Array.isArray(key)
      ? this.getKey(namespace, ...key)
      : this.getKey(namespace, key);

    const serialized = JSON.stringify(value);
    const expiry = ttl || this.TTL.DEFAULT;

    await redis.setex(cacheKey, expiry, serialized);
  }

  // 获取缓存
  static async get<T>(
    namespace: string,
    key: string | string[],
  ): Promise<T | null> {
    const cacheKey = Array.isArray(key)
      ? this.getKey(namespace, ...key)
      : this.getKey(namespace, key);

    const cached = await redis.get(cacheKey);

    if (!cached) return null;

    try {
      return JSON.parse(cached) as T;
    } catch {
      return null;
    }
  }

  // 删除缓存
  static async delete(
    namespace: string,
    key: string | string[],
  ): Promise<void> {
    const cacheKey = Array.isArray(key)
      ? this.getKey(namespace, ...key)
      : this.getKey(namespace, key);

    await redis.del(cacheKey);
  }

  // 批量删除缓存（通过模式匹配）
  static async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(`${this.PREFIX}${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  // 清空某个命名空间的所有缓存
  static async clearNamespace(namespace: string): Promise<void> {
    await this.deletePattern(`${namespace}:*`);
  }

  // 缓存装饰器函数
  static async withCache<T>(
    namespace: string,
    key: string | string[],
    fetcher: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = await this.get<T>(namespace, key);
    if (cached !== null) {
      return cached;
    }

    // 缓存未命中，执行获取函数
    const result = await fetcher();

    // 存入缓存
    await this.set(namespace, key, result, ttl);

    return result;
  }

  // Mock 数据缓存
  static async getMockData<T = unknown>(
    projectId: string,
    path: string,
    method: string,
  ): Promise<T | null> {
    return this.get<T>("mock", [projectId, path, method]);
  }

  static async setMockData<T>(
    projectId: string,
    path: string,
    method: string,
    data: T,
  ): Promise<void> {
    return this.set(
      "mock",
      [projectId, path, method],
      data,
      this.TTL.MOCK_DATA,
    );
  }

  // 用户 Session 缓存
  static async getUserSession<T = unknown>(userId: string): Promise<T | null> {
    return this.get<T>("session", userId);
  }

  static async setUserSession<T>(userId: string, session: T): Promise<void> {
    return this.set("session", userId, session, this.TTL.USER_SESSION);
  }

  // API 统计缓存
  static async getApiStats<T = unknown>(
    mockApiId: string,
    date: string,
  ): Promise<T | null> {
    return this.get<T>("stats", [mockApiId, date]);
  }

  static async setApiStats<T>(
    mockApiId: string,
    date: string,
    stats: T,
  ): Promise<void> {
    return this.set("stats", [mockApiId, date], stats, this.TTL.API_STATS);
  }

  // 项目信息缓存
  static async getProjectInfo<T = unknown>(
    projectId: string,
  ): Promise<T | null> {
    return this.get<T>("project", projectId);
  }

  static async setProjectInfo<T>(projectId: string, info: T): Promise<void> {
    return this.set("project", projectId, info, this.TTL.PROJECT_INFO);
  }

  // 清除项目相关的所有缓存
  static async clearProjectCache(projectId: string): Promise<void> {
    await Promise.all([
      this.deletePattern(`mock:${projectId}:*`),
      this.delete("project", projectId),
    ]);
  }
}

// 导出缓存管理器实例
export const cache = CacheManager;
