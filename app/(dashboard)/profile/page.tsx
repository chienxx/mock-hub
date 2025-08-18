import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./ProfileClient";

export const metadata: Metadata = {
  title: "个人资料 - Mock Hub",
  description: "管理您的个人信息",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // 获取用户详细信息
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          createdProjects: true,
          projectMembers: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  // 获取用户的项目活动统计
  const [recentProjects, apiStats] = await Promise.all([
    // 最近参与的项目
    prisma.project.findMany({
      where: {
        OR: [
          { creatorId: user.id },
          {
            members: {
              some: { userId: user.id },
            },
          },
        ],
        status: "ACTIVE",
      },
      select: {
        id: true,
        shortId: true,
        name: true,
        updatedAt: true,
        createdBy: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            mockAPIs: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),

    // API调用统计
    prisma.aPILog.count({
      where: {
        mockApi: {
          project: {
            OR: [
              { creatorId: user.id },
              {
                members: {
                  some: { userId: user.id },
                },
              },
            ],
          },
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天内
        },
      },
    }),
  ]);

  return (
    <ProfileClient
      user={user}
      recentProjects={recentProjects}
      apiCallsLast30Days={apiStats}
    />
  );
}
