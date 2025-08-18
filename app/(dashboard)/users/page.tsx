import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserManagementClient } from "./UserManagementClient";

export const metadata: Metadata = {
  title: "用户管理 - Mock Hub",
  description: "管理系统用户",
};

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // 仅管理员可访问
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  // 获取所有用户数据
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          createdProjects: true,
          projectMembers: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 获取统计数据
  const [totalUsers, activeUsers, adminCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);

  return (
    <UserManagementClient
      users={users}
      currentUserId={session.user.id}
      stats={{
        total: totalUsers,
        active: activeUsers,
        admins: adminCount,
      }}
    />
  );
}
