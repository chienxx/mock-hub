import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { checkProjectPermission } from "@/lib/api/project-helpers";
import { getApiLogs } from "@/lib/api/log-helper";
import { ApiResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/error-handler";
import { ProjectRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 获取项目的API调用日志
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiResponse.unauthorized("请先登录");
    }

    const { id: projectId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // 检查项目权限
    const hasPermission = await checkProjectPermission(
      projectId,
      session.user.id,
      ProjectRole.VIEWER,
    );

    if (!hasPermission) {
      return ApiResponse.forbidden("没有权限访问此项目");
    }

    // 解析查询参数
    const mockApiId = searchParams.get("mockApiId") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const statusCode = searchParams.get("statusCode")
      ? parseInt(searchParams.get("statusCode")!)
      : undefined;
    const isProxied =
      searchParams.get("isProxied") === "true"
        ? true
        : searchParams.get("isProxied") === "false"
          ? false
          : undefined;
    const method = searchParams.get("method") || undefined;

    // 日期范围
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    // 获取日志
    const result = await getApiLogs(mockApiId, projectId, {
      page,
      pageSize,
      statusCode,
      isProxied,
      method,
      startDate,
      endDate,
    });

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error);
  }
}
