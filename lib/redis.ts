import Redis, { RedisOptions } from "ioredis";

// 创建 Redis 客户端单例
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// 构建Redis连接配置
const redisConfig: RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error("Redis 连接失败，超过最大重试次数");
      return null;
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      // 只在 READONLY 错误时重连
      return true;
    }
    return false;
  },
};

// 如果有密码，添加到配置中
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", redisConfig);

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// Redis 连接事件监听
redis.on("connect", () => {
  // Redis connected successfully
});

redis.on("error", (err) => {
  console.error("Redis 错误:", err);
});

redis.on("close", () => {
  // Redis connection closed
});

// Redis 健康检查
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch (error) {
    console.error("Redis 健康检查失败:", error);
    return false;
  }
}

// 优雅关闭
export async function closeRedisConnection(): Promise<void> {
  await redis.quit();
}
