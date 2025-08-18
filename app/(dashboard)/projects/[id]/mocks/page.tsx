import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectRole } from "@prisma/client";
import { MocksPageClient } from "./MocksPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MocksPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const { id } = await params;

  // 获取项目信息和权限
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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
    },
  });

  if (!project) {
    notFound();
  }

  // 检查用户权限
  let userRole: ProjectRole | "ADMIN" | undefined;
  let canManage = false;

  // 检查系统管理员
  if (session.user.role === "ADMIN") {
    userRole = "ADMIN";
    canManage = true;
  } else {
    // 普通用户检查项目成员权限
    const member = project.members.find((m) => m.user.id === session.user.id);
    userRole = member?.role;

    // 如果用户不是系统管理员且不是项目成员，则无权访问
    if (!member) {
      notFound();
    }

    canManage =
      userRole === ProjectRole.MANAGER || userRole === ProjectRole.DEVELOPER;
  }

  // 获取分组列表
  const collections = await prisma.collection.findMany({
    where: { projectId: id },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          mockAPIs: true,
        },
      },
    },
  });

  return (
    <MocksPageClient
      projectId={id}
      projectName={project.name}
      projectShortId={project.shortId}
      mockAPIsCount={project._count.mockAPIs}
      collectionsCount={project._count.collections}
      collections={collections}
      canManage={canManage}
    />
  );
}
