import { prisma } from "@/lib/prisma";
import { HTTPMethod } from "@prisma/client";
import { cache } from "@/lib/cache";

// const CACHE_TTL = 300 // 5分钟缓存

/**
 * 匹配Mock API路由
 * 支持精确匹配和路径参数匹配
 */
export async function matchRoute(
  projectId: string,
  path: string,
  method: HTTPMethod,
) {
  // 尝试从缓存获取
  const cached = await cache.getMockData(projectId, path, method);
  if (cached) {
    return cached;
  }

  // 首先尝试精确匹配
  let mockApi = await prisma.mockAPI.findFirst({
    where: {
      projectId,
      path,
      method,
      enabled: true,
    },
    include: {
      rules: {
        where: { enabled: true },
        orderBy: { priority: "asc" },
      },
    },
  });

  // 如果没有精确匹配，尝试路径参数匹配
  if (!mockApi) {
    // 获取项目的Mock API（只获取路径和基本信息，优化性能）
    const allMockApis = await prisma.mockAPI.findMany({
      where: {
        projectId,
        method,
        enabled: true,
        // 优化：只查找包含路径参数的API
        path: {
          contains: ":",
        },
      },
      include: {
        rules: {
          where: { enabled: true },
          orderBy: { priority: "asc" },
        },
      },
    });

    // 尝试匹配路径参数
    for (const api of allMockApis) {
      if (matchPathPattern(path, api.path)) {
        mockApi = api;
        break;
      }
    }
  }

  // 缓存结果
  if (mockApi) {
    await cache.setMockData(projectId, path, method, mockApi);
  }

  return mockApi;
}

/**
 * 匹配路径模式
 * 支持 :param 形式的路径参数
 * 例如: /api/users/:id 可以匹配 /api/users/123
 */
function matchPathPattern(requestPath: string, pattern: string): boolean {
  // 移除开头和结尾的斜杠
  const normalizedRequest = requestPath.replace(/^\/|\/$/g, "");
  const normalizedPattern = pattern.replace(/^\/|\/$/g, "");

  // 分割路径段，过滤空字符串
  const requestSegments = normalizedRequest ? normalizedRequest.split("/") : [];
  const patternSegments = normalizedPattern ? normalizedPattern.split("/") : [];

  // 段数不匹配
  if (requestSegments.length !== patternSegments.length) {
    return false;
  }

  // 逐段匹配
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const requestSegment = requestSegments[i];

    // 路径参数
    if (patternSegment.startsWith(":")) {
      continue; // 路径参数总是匹配
    }

    // 通配符
    if (patternSegment === "*") {
      continue; // 通配符总是匹配
    }

    // 精确匹配
    if (patternSegment !== requestSegment) {
      return false;
    }
  }

  return true;
}

/**
 * 清除Mock API缓存
 */
export async function clearMockCache(
  projectId: string,
  path?: string,
  method?: HTTPMethod,
) {
  try {
    if (path && method) {
      // 清除特定路由缓存
      await cache.delete("mock", [projectId, path, method]);
    } else {
      // 清除项目所有缓存
      await cache.clearProjectCache(projectId);
    }
  } catch (error) {
    console.error("Clear cache error:", error);
  }
}

/**
 * 预热缓存
 */
export async function warmupCache(projectId: string) {
  try {
    const mockApis = await prisma.mockAPI.findMany({
      where: {
        projectId,
        enabled: true,
      },
      include: {
        rules: {
          where: { enabled: true },
          orderBy: { priority: "asc" },
        },
      },
    });

    for (const api of mockApis) {
      await cache.setMockData(projectId, api.path, api.method, api);
    }

    // Warmed up cache for APIs in project
  } catch {
    // Warmup cache error
  }
}
