import { ProjectStatus, ProjectRole, UserRole } from "@prisma/client";

// 用户基本信息
export interface UserInfo {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  role?: UserRole;
}

// 项目成员信息
export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  createdAt: Date | string;
  user: UserInfo;
}

// 项目详情
export interface Project {
  id: string;
  shortId: string;
  name: string;
  description?: string | null;
  proxyUrl?: string | null;
  status: ProjectStatus;
  creatorId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: UserInfo;
  members?: ProjectMember[];
  _count?: {
    mockAPIs: number;
    collections: number;
    members?: number;
  };
  userRole?: ProjectRole | "ADMIN";
  // 兼容性字段
  mockAPICount?: number;
  memberCount?: number;
}

// API响应类型（与后端ApiResponse一致）
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
