import { HTTPMethod, ProxyMode } from "@prisma/client";

// Mock API 基本信息
export interface MockAPI {
  id: string;
  projectId: string;
  collectionId?: string | null;
  path: string;
  method: HTTPMethod;
  name?: string | null;
  description?: string | null;
  enabled: boolean;
  proxyMode: ProxyMode;
  useFakerJs: boolean;
  responseDelay?: number | null;
  responseStatus: number;
  responseHeaders?: Record<string, string> | null;
  responseBody?: unknown | null;
  creatorId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  // 关联数据
  collection?: Collection | null;
  rules?: MockRule[];
  createdBy?: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
}

// Collection 分组
export interface Collection {
  id: string;
  projectId: string;
  name: string;
  parentId?: string | null;
  order: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  // 关联数据
  mockAPIs?: MockAPI[];
  children?: Collection[];
  _count?: {
    mockAPIs: number;
  };
}

// Mock 规则
export interface MockRule {
  id: string;
  mockApiId: string;
  priority: number;
  enabled: boolean;
  name?: string | null;
  conditions?: Record<string, unknown> | null;
  statusCode?: number | null;
  headers?: Record<string, string> | null;
  body?: unknown | null;
  delay?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// 创建 Mock API 的输入
export interface CreateMockAPIInput {
  path: string;
  method: HTTPMethod;
  name?: string;
  description?: string;
  collectionId?: string;
  proxyMode?: ProxyMode;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
}

// 更新 Mock API 的输入
export interface UpdateMockAPIInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  collectionId?: string;
  proxyMode?: ProxyMode;
  useFakerJs?: boolean;
  responseDelay?: number;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
}

// API 响应格式
export interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  message: string;
  timestamp?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
