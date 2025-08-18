import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "../DashboardClient";

export const metadata: Metadata = {
  title: "仪表盘 - Mock Hub",
  description: "查看项目概览和统计信息",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // 获取用户相关的统计数据
  const [
    projectCount,
    mockApiCount,
    todayLogsCount,
    recentProjects,
    recentMockApis,
    recentLogs,
  ] = await Promise.all([
    // 项目总数
    prisma.project.count({
      where: {
        OR: [
          { creatorId: session.user.id },
          {
            members: {
              some: { userId: session.user.id },
            },
          },
        ],
        status: "ACTIVE",
      },
    }),

    // Mock API总数
    prisma.mockAPI.count({
      where: {
        project: {
          OR: [
            { creatorId: session.user.id },
            {
              members: {
                some: { userId: session.user.id },
              },
            },
          ],
          status: "ACTIVE",
        },
      },
    }),

    // 今日调用次数
    prisma.aPILog.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
        mockApi: {
          project: {
            OR: [
              { creatorId: session.user.id },
              {
                members: {
                  some: { userId: session.user.id },
                },
              },
            ],
          },
        },
      },
    }),

    // 最近项目
    prisma.project.findMany({
      where: {
        OR: [
          { creatorId: session.user.id },
          {
            members: {
              some: { userId: session.user.id },
            },
          },
        ],
        status: "ACTIVE",
      },
      select: {
        id: true,
        shortId: true,
        name: true,
        description: true,
        updatedAt: true,
        _count: {
          select: {
            mockAPIs: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),

    // 最近创建的Mock API
    prisma.mockAPI.findMany({
      where: {
        project: {
          OR: [
            { creatorId: session.user.id },
            {
              members: {
                some: { userId: session.user.id },
              },
            },
          ],
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
        name: true,
        method: true,
        path: true,
        enabled: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            shortId: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // 最近的API日志（错误）
    prisma.aPILog.findMany({
      where: {
        statusCode: { gte: 400 },
        mockApi: {
          project: {
            OR: [
              { creatorId: session.user.id },
              {
                members: {
                  some: { userId: session.user.id },
                },
              },
            ],
          },
        },
      },
      select: {
        id: true,
        method: true,
        path: true,
        statusCode: true,
        createdAt: true,
        mockApi: {
          select: {
            name: true,
            project: {
              select: {
                shortId: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // 获取热门API和问题API
  const last7DaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [hotApis, problemApis] = await Promise.all([
    // 热门API - 调用次数最多
    prisma.aPILog.groupBy({
      by: ["mockApiId"],
      where: {
        createdAt: { gte: last7DaysAgo },
        mockApi: {
          project: {
            OR: [
              { creatorId: session.user.id },
              {
                members: {
                  some: { userId: session.user.id },
                },
              },
            ],
          },
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    }),

    // 问题API - 错误率最高
    prisma.aPILog.groupBy({
      by: ["mockApiId"],
      where: {
        createdAt: { gte: last7DaysAgo },
        statusCode: { gte: 400 },
        mockApi: {
          project: {
            OR: [
              { creatorId: session.user.id },
              {
                members: {
                  some: { userId: session.user.id },
                },
              },
            ],
          },
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    }),
  ]);

  // 获取API详情
  const hotApiDetails =
    hotApis.length > 0
      ? await prisma.mockAPI.findMany({
          where: {
            id: { in: hotApis.map((api) => api.mockApiId) },
          },
          select: {
            id: true,
            name: true,
            method: true,
            path: true,
            project: {
              select: {
                id: true,
                shortId: true,
                name: true,
              },
            },
          },
        })
      : [];

  const problemApiDetails =
    problemApis.length > 0
      ? await prisma.mockAPI.findMany({
          where: {
            id: { in: problemApis.map((api) => api.mockApiId) },
          },
          select: {
            id: true,
            name: true,
            method: true,
            path: true,
            project: {
              select: {
                id: true,
                shortId: true,
                name: true,
              },
            },
          },
        })
      : [];

  // 组合数据
  const hotApisWithCount = hotApiDetails
    .map((api) => ({
      ...api,
      count: hotApis.find((h) => h.mockApiId === api.id)?._count.id || 0,
    }))
    .sort((a, b) => b.count - a.count);

  const problemApisWithCount = problemApiDetails
    .map((api) => ({
      ...api,
      errorCount:
        problemApis.find((p) => p.mockApiId === api.id)?._count.id || 0,
    }))
    .sort((a, b) => b.errorCount - a.errorCount);

  // 计算错误率
  const last24HoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [totalLogs24h, errorLogs24h] = await Promise.all([
    prisma.aPILog.count({
      where: {
        createdAt: { gte: last24HoursAgo },
        mockApi: {
          project: {
            OR: [
              { creatorId: session.user.id },
              {
                members: {
                  some: { userId: session.user.id },
                },
              },
            ],
          },
        },
      },
    }),
    prisma.aPILog.count({
      where: {
        createdAt: { gte: last24HoursAgo },
        statusCode: { gte: 400 },
        mockApi: {
          project: {
            OR: [
              { creatorId: session.user.id },
              {
                members: {
                  some: { userId: session.user.id },
                },
              },
            ],
          },
        },
      },
    }),
  ]);

  const errorRate =
    totalLogs24h > 0 ? ((errorLogs24h / totalLogs24h) * 100).toFixed(2) : "0";

  return (
    <DashboardClient
      userId={session.user.id}
      userRole={session.user.role}
      stats={{
        projectCount,
        mockApiCount,
        todayLogsCount,
        errorRate,
      }}
      recentProjects={recentProjects}
      recentMockApis={recentMockApis}
      recentLogs={recentLogs}
      hotApis={hotApisWithCount}
      problemApis={problemApisWithCount}
    />
  );
}
