import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchRoute } from "@/lib/mock/matcher";
import { executeRule } from "@/lib/mock/rule-executor";
import { handleProxy } from "@/lib/mock/proxy-handler";
import { parseFakerTemplate } from "@/lib/mock/faker-parser";
import { recordApiLog as logApiCall } from "@/lib/api/log-helper";
import { ProxyMode, HTTPMethod } from "@prisma/client";
import type { MockAPI, MockRule } from "@prisma/client";
import { notifyApiError } from "@/lib/api/notification-helper";

interface RouteParams {
  params: Promise<{ shortId: string; path: string[] }>;
}

// 将Next.js方法映射到Prisma枚举
const methodMapping: Record<string, HTTPMethod> = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  // 注意：Prisma schema只定义了这4种方法，如需支持PATCH等需要更新schema
};

// 通用处理函数
async function handleMockRequest(
  request: NextRequest,
  { params }: RouteParams,
) {
  const startTime = Date.now();

  try {
    const { shortId, path: pathSegments } = await params;
    const method = request.method.toUpperCase();
    const mappedMethod = methodMapping[method];

    if (!mappedMethod) {
      return NextResponse.json(
        { error: "Method not allowed" },
        { status: 405 },
      );
    }

    // 构建完整路径，过滤空字符串
    const fullPath = "/" + pathSegments.filter(Boolean).join("/");

    // 获取项目
    const project = await prisma.project.findUnique({
      where: { shortId },
      select: {
        id: true,
        proxyUrl: true,
        status: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Project is not active" },
        { status: 403 },
      );
    }

    // 查找匹配的Mock API
    const mockApi = (await matchRoute(project.id, fullPath, mappedMethod)) as
      | (MockAPI & { rules: MockRule[] })
      | null;

    // 准备请求上下文
    const requestContext = {
      method: mappedMethod,
      path: fullPath,
      query: Object.fromEntries(request.nextUrl.searchParams),
      headers: Object.fromEntries(request.headers.entries()),
      body: await getRequestBody(request),
      params: extractPathParams(fullPath, mockApi?.path),
    };

    let response: NextResponse;
    let matchedRuleId: string | null = null;
    let isProxied = false;
    let proxyUrl: string | null = null;

    if (!mockApi || !mockApi.enabled) {
      // 没有找到Mock API或已禁用，根据项目配置决定是否代理
      if (project.proxyUrl) {
        const proxyResponse = await handleProxy(
          project.proxyUrl,
          fullPath,
          request,
        );
        response = proxyResponse.response;
        isProxied = true;
        proxyUrl = proxyResponse.url;
      } else {
        response = NextResponse.json(
          { error: "Mock API not found" },
          { status: 404 },
        );
      }
    } else {
      // 处理Mock API
      switch (mockApi.proxyMode) {
        case ProxyMode.PROXY:
          // 始终代理
          if (project.proxyUrl) {
            const proxyResponse = await handleProxy(
              project.proxyUrl,
              fullPath,
              request,
            );
            response = proxyResponse.response;
            isProxied = true;
            proxyUrl = proxyResponse.url;

            // 如果代理失败，发送通知
            if (proxyResponse.error && mockApi.id) {
              await notifyApiError(mockApi.id, {
                method: mappedMethod,
                path: fullPath,
                statusCode: response.status,
                errorMessage: proxyResponse.error.message,
              });
            }
          } else {
            response = NextResponse.json(
              { error: "No proxy URL configured for proxy" },
              { status: 500 },
            );
          }
          break;

        case ProxyMode.AUTO:
          // 自动模式：先尝试规则匹配
          const autoMatchedRule = await executeRule(mockApi.id, requestContext);

          if (autoMatchedRule) {
            response = await createMockResponse(autoMatchedRule, mockApi);
            matchedRuleId = autoMatchedRule.id;
          } else if (mockApi.responseBody) {
            // 使用默认响应
            response = await createMockResponse(mockApi, mockApi);
          } else if (project.proxyUrl) {
            // 代理到真实服务器
            const proxyResponse = await handleProxy(
              project.proxyUrl,
              fullPath,
              request,
            );
            response = proxyResponse.response;
            isProxied = true;
            proxyUrl = proxyResponse.url;

            // 如果代理失败，发送通知
            if (proxyResponse.error && mockApi.id) {
              await notifyApiError(mockApi.id, {
                method: mappedMethod,
                path: fullPath,
                statusCode: response.status,
                errorMessage: proxyResponse.error.message,
              });
            }
          } else {
            response = NextResponse.json(
              { error: "No mock data or proxy URL available" },
              { status: 404 },
            );
          }
          break;

        case ProxyMode.MOCK:
        default:
          // 仅Mock模式
          const matchedRule = await executeRule(mockApi.id, requestContext);

          if (matchedRule) {
            response = await createMockResponse(matchedRule, mockApi);
            matchedRuleId = matchedRule.id;
          } else if (mockApi.responseBody) {
            response = await createMockResponse(mockApi, mockApi);
          } else {
            response = NextResponse.json(
              { message: "No mock data configured" },
              { status: 200 },
            );
          }
          break;
      }
    }

    // 记录API日志（无论是否找到Mock API都要记录）
    const responseTime = Date.now() - startTime;
    if (mockApi) {
      // 有Mock API时的完整日志
      await logApiCall({
        mockApiId: mockApi.id,
        method: mappedMethod,
        path: fullPath,
        query: requestContext.query,
        headers: requestContext.headers,
        body: requestContext.body,
        statusCode: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBody: await getResponseBody(response),
        responseTime,
        ruleId: matchedRuleId,
        isProxied,
        proxyUrl,
        ip: getClientIp(request),
        userAgent: request.headers.get("user-agent"),
      });
    } else {
      // 没有Mock API时，在开发环境记录基础日志（用于404等情况的调试）
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `Mock API not found: ${mappedMethod} ${fullPath} - ${response.status} (${responseTime}ms)`,
        );
      }
    }

    // 添加CORS头
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    response.headers.set("Access-Control-Allow-Headers", "*");

    return response;
  } catch (error) {
    console.error("Mock service error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// 创建Mock响应
async function createMockResponse(
  source: MockRule | MockAPI,
  mockApi: MockAPI,
): Promise<NextResponse> {
  // 确定响应数据来源
  const statusCode =
    "statusCode" in source && source.statusCode
      ? source.statusCode
      : mockApi.responseStatus;

  const headers =
    "headers" in source && source.headers
      ? (source.headers as Record<string, string>)
      : (mockApi.responseHeaders as Record<string, string> | null);

  let body: unknown =
    "body" in source && source.body ? source.body : mockApi.responseBody;

  const delay =
    "delay" in source && source.delay
      ? source.delay
      : mockApi.responseDelay || 0;

  // 处理延迟
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  // 处理Faker.js语法
  if (mockApi.useFakerJs && body) {
    body = parseFakerTemplate(body);
  }

  // 创建响应
  const response = NextResponse.json(body || {}, { status: statusCode });

  // 设置响应头
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

// 获取请求体
async function getRequestBody(request: NextRequest): Promise<unknown> {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType) return null;

    if (contentType.includes("application/json")) {
      return await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      return Object.fromEntries(new URLSearchParams(text));
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const data: Record<string, unknown> = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });
      return data;
    } else {
      return await request.text();
    }
  } catch {
    return null;
  }
}

// 获取响应体
async function getResponseBody(response: NextResponse): Promise<unknown> {
  try {
    const cloned = response.clone();
    return await cloned.json();
  } catch {
    try {
      const cloned = response.clone();
      return await cloned.text();
    } catch {
      return null;
    }
  }
}

// 提取路径参数
function extractPathParams(
  requestPath: string,
  mockPath?: string,
): Record<string, string> {
  if (!mockPath) return {};

  const params: Record<string, string> = {};
  const requestSegments = requestPath.split("/").filter(Boolean);
  const mockSegments = mockPath.split("/").filter(Boolean);

  mockSegments.forEach((segment, index) => {
    if (segment.startsWith(":")) {
      const paramName = segment.slice(1);
      params[paramName] = requestSegments[index] || "";
    }
  });

  return params;
}

// 获取客户端IP
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";
  return ip;
}

// 导出HTTP方法处理函数
export async function GET(request: NextRequest, context: RouteParams) {
  return handleMockRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteParams) {
  return handleMockRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return handleMockRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return handleMockRequest(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
