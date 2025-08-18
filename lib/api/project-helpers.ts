import { prisma } from "@/lib/prisma";
import { ProjectRole } from "@prisma/client";

/**
 * 检查用户是否有项目权限
 * @param projectId 项目ID
 * @param userId 用户ID
 * @param requiredRole 所需的最低项目角色权限
 * @returns 是否有权限
 */
export async function checkProjectPermission(
  projectId: string,
  userId: string,
  requiredRole: ProjectRole = ProjectRole.VIEWER,
): Promise<boolean> {
  // 首先检查用户的系统角色
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return false;

  // 系统管理员对所有项目有完全权限
  if (user.role === "ADMIN") {
    return true;
  }

  // 普通用户需要检查项目成员权限
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  if (!member) return false;

  const roleHierarchy = {
    [ProjectRole.VIEWER]: 0,
    [ProjectRole.DEVELOPER]: 1,
    [ProjectRole.MANAGER]: 2,
  };

  return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
}

/**
 * 获取用户在项目中的角色
 * @param projectId 项目ID
 * @param userId 用户ID
 * @returns 用户角色或'ADMIN'表示系统管理员，null表示无权限
 */
export async function getUserProjectRole(
  projectId: string,
  userId: string,
): Promise<ProjectRole | "ADMIN" | null> {
  // 首先检查用户的系统角色
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return null;

  // 系统管理员返回特殊标识
  if (user.role === "ADMIN") {
    return "ADMIN";
  }

  // 检查项目成员角色
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    select: { role: true },
  });

  return member?.role || null;
}

/**
 * 项目查询的标准include选项
 */
export const projectInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  },
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  },
  _count: {
    select: {
      mockAPIs: true,
      collections: true,
    },
  },
};
