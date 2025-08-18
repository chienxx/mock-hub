import { NextResponse } from "next/server";

// API 响应状态码
export enum ApiCode {
  SUCCESS = 0,
  ERROR = -1,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  VALIDATION_ERROR = 422,
  SERVER_ERROR = 500,
}

// API 响应接口
export interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  message: string;
  timestamp?: number;
}

// 创建成功响应
export function success<T = unknown>(
  data?: T,
  message = "操作成功",
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    code: ApiCode.SUCCESS,
    data,
    message,
    timestamp: Date.now(),
  });
}

// 创建错误响应
export function error(
  message = "操作失败",
  code = ApiCode.ERROR,
  status = 400,
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      code,
      message,
      timestamp: Date.now(),
    },
    { status },
  );
}

// 创建错误请求响应（400）
export function badRequest(
  message = "请求参数错误",
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      code: ApiCode.ERROR,
      message,
      timestamp: Date.now(),
    },
    { status: 400 },
  );
}

// 创建未授权响应
export function unauthorized(
  message = "未授权，请先登录",
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      code: ApiCode.UNAUTHORIZED,
      message,
      timestamp: Date.now(),
    },
    { status: 401 },
  );
}

// 创建禁止访问响应
export function forbidden(
  message = "无权访问此资源",
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      code: ApiCode.FORBIDDEN,
      message,
      timestamp: Date.now(),
    },
    { status: 403 },
  );
}

// 创建未找到响应
export function notFound(message = "资源不存在"): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      code: ApiCode.NOT_FOUND,
      message,
      timestamp: Date.now(),
    },
    { status: 404 },
  );
}

// 创建验证错误响应
export function validationError(
  message = "输入数据验证失败",
  errors?: unknown,
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      code: ApiCode.VALIDATION_ERROR,
      data: errors,
      message,
      timestamp: Date.now(),
    },
    { status: 422 },
  );
}

// 创建服务器错误响应
export function serverError(
  message = "服务器内部错误",
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      code: ApiCode.SERVER_ERROR,
      message,
      timestamp: Date.now(),
    },
    { status: 500 },
  );
}

// 分页数据响应
export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 创建分页响应
export function paginated<T>(
  list: T[],
  total: number,
  page: number,
  pageSize: number,
  message = "获取成功",
): NextResponse<ApiResponse<PaginatedData<T>>> {
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    code: ApiCode.SUCCESS,
    data: {
      list,
      total,
      page,
      pageSize,
      totalPages,
    },
    message,
    timestamp: Date.now(),
  });
}

// API 响应工具类
export class ApiResponseBuilder {
  static success = success;
  static error = error;
  static badRequest = badRequest;
  static unauthorized = unauthorized;
  static forbidden = forbidden;
  static notFound = notFound;
  static validationError = validationError;
  static serverError = serverError;
  static paginated = paginated;
}

// 导出别名，方便使用
export const ApiResponse = ApiResponseBuilder;

// 创建通用API响应
export function createApiResponse<T = unknown>(
  data: T | null,
  message = "操作成功",
  code = 0,
): ApiResponse<T> {
  return {
    code,
    data: data ?? undefined,
    message,
    timestamp: Date.now(),
  };
}
