import { NextRequest, NextResponse } from "next/server";
import { Agent } from "undici";

interface ProxyResponse {
  response: NextResponse;
  url: string;
  error?: {
    message: string;
    isSSLError?: boolean;
  };
}

/**
 * 处理代理请求
 * 将请求转发到真实的后端服务器
 */
export async function handleProxy(
  baseUrl: string,
  path: string,
  request: NextRequest,
  extraHeaders?: Record<string, string>,
): Promise<ProxyResponse> {
  try {
    // 构建目标URL
    const targetUrl = new URL(path, baseUrl);

    // 复制查询参数
    request.nextUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    // 准备请求头
    const headers = new Headers();

    // 复制原始请求头（排除一些特殊的头）
    const excludeHeaders = [
      "host",
      "connection",
      "keep-alive",
      "upgrade",
      "cache-control",
      "te",
      "trailer",
      "transfer-encoding",
      "upgrade-insecure-requests",
    ];

    request.headers.forEach((value, key) => {
      if (!excludeHeaders.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    // 设置转发相关的头
    headers.set("X-Forwarded-For", getClientIp(request));
    headers.set("X-Forwarded-Proto", request.nextUrl.protocol.replace(":", ""));
    headers.set("X-Forwarded-Host", request.nextUrl.host);

    // 添加额外的headers
    if (extraHeaders) {
      Object.entries(extraHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    // 准备请求体
    let body: BodyInit | undefined = undefined;
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      const contentType = request.headers.get("content-type");

      try {
        if (contentType?.includes("application/json")) {
          const jsonData = await request.json();
          body = JSON.stringify(jsonData);
        } else if (contentType?.includes("multipart/form-data")) {
          // FormData直接传递
          body = await request.formData();
        } else if (contentType?.includes("application/x-www-form-urlencoded")) {
          body = await request.text();
        } else {
          // 其他类型作为文本传递
          body = await request.text();
        }
      } catch {
        // 如果读取失败，尝试获取arrayBuffer作为fallback
        try {
          body = await request.arrayBuffer();
        } catch {
          body = undefined;
        }
      }
    }

    // 在开发环境或明确设置忽略SSL时，使用自定义agent
    const ignoreSSL = process.env.IGNORE_SSL_ERRORS === "true";

    // 发起代理请求
    const fetchOptions: RequestInit & { dispatcher?: Agent } = {
      method: request.method,
      headers,
      body,
      // 不自动重定向，让客户端处理
      redirect: "manual",
      // 如果需要忽略SSL证书
      ...(targetUrl.protocol === "https:" &&
        (process.env.NODE_ENV === "development" || ignoreSSL) && {
          dispatcher: new Agent({
            connect: {
              rejectUnauthorized: false,
            },
          }),
        }),
    };

    const proxyResponse = await fetch(targetUrl.toString(), fetchOptions);

    // 准备响应头
    const responseHeaders = new Headers();

    // 复制响应头（排除一些特殊的头）
    const excludeResponseHeaders = [
      "content-encoding", // Next.js会自动处理压缩
      "content-length", // 会自动重新计算
      "transfer-encoding",
      "connection",
    ];

    proxyResponse.headers.forEach((value, key) => {
      if (!excludeResponseHeaders.includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // 处理重定向
    if ([301, 302, 303, 307, 308].includes(proxyResponse.status)) {
      const location = proxyResponse.headers.get("location");
      if (location) {
        responseHeaders.set("location", location);
      }

      return {
        response: new NextResponse(null, {
          status: proxyResponse.status,
          headers: responseHeaders,
        }),
        url: targetUrl.toString(),
      };
    }

    // 获取响应体
    let responseBody: unknown;
    const contentType = proxyResponse.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      try {
        responseBody = await proxyResponse.json();
      } catch {
        responseBody = await proxyResponse.text();
      }
    } else if (contentType?.includes("text/")) {
      responseBody = await proxyResponse.text();
    } else {
      // 二进制数据
      const buffer = await proxyResponse.arrayBuffer();
      return {
        response: new NextResponse(buffer, {
          status: proxyResponse.status,
          headers: responseHeaders,
        }),
        url: targetUrl.toString(),
      };
    }

    // 返回JSON响应
    if (typeof responseBody === "object") {
      return {
        response: NextResponse.json(responseBody, {
          status: proxyResponse.status,
          headers: responseHeaders,
        }),
        url: targetUrl.toString(),
      };
    }

    // 返回文本响应
    return {
      response: new NextResponse(responseBody as BodyInit, {
        status: proxyResponse.status,
        headers: responseHeaders,
      }),
      url: targetUrl.toString(),
    };
  } catch (error) {
    // 检查是否为SSL证书错误
    const isSSLError =
      error instanceof Error &&
      (error.message.includes("certificate") ||
        error.message.includes("CERT_") ||
        error.message.includes("SSL") ||
        error.message.includes("HTTPS") ||
        (error.cause as { code?: string })?.code === "CERT_HAS_EXPIRED");

    let errorMessage =
      error instanceof Error ? error.message : "Failed to proxy request";
    let suggestions: string[] = [];

    if (isSSLError) {
      errorMessage =
        "SSL Certificate Error: Unable to verify the target server's certificate";
      suggestions = [
        "Check if the target server's SSL certificate is valid",
        "For development, you can set IGNORE_SSL_ERRORS=true in environment variables",
        "Ensure the target URL uses HTTPS with a valid certificate",
      ];
    }

    // 返回代理错误
    return {
      response: NextResponse.json(
        {
          error: "Proxy Error",
          message: errorMessage,
          target: baseUrl + path,
          ...(suggestions.length > 0 && { suggestions }),
        },
        { status: 502 },
      ),
      url: baseUrl + path,
      error: {
        message: errorMessage,
        isSSLError,
      },
    };
  }
}

/**
 * 获取客户端IP
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";
  return ip;
}

/**
 * 代理中间件配置
 */
export interface ProxyConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  rewritePath?: (path: string) => string;
}

/**
 * 创建代理处理器
 * 支持更多配置选项
 */
export function createProxyHandler(config: ProxyConfig) {
  return async (path: string, request: NextRequest): Promise<ProxyResponse> => {
    // 路径重写
    if (config.rewritePath) {
      path = config.rewritePath(path);
    }

    // 注意：不能直接修改原始request的headers，需要在代理请求中处理
    // 这里仅记录额外的headers，在handleProxy中使用

    // 设置超时
    if (config.timeout) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      try {
        const response = await handleProxy(config.baseUrl, path, request);
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          return {
            response: NextResponse.json(
              { error: "Proxy timeout" },
              { status: 504 },
            ),
            url: config.baseUrl + path,
          };
        }
        throw error;
      }
    }

    return handleProxy(config.baseUrl, path, request, config.headers);
  };
}
