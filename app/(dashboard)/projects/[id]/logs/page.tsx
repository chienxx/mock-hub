import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectRole } from "@prisma/client";
import { LogsPageClient } from "./LogsPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectLogsPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const { id } = await params;

  // 获取项目信息
  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      shortId: true,
      creatorId: true,
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // 检查用户权限
  const isMember = project.members.length > 0;
  const userRole = project.members[0]?.role;
  const isCreator = project.creatorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isAdmin && !isCreator && !isMember) {
    notFound();
  }

  // 判断是否可以删除日志（管理员、创建者、MANAGER或DEVELOPER角色）
  const canDelete =
    isAdmin ||
    isCreator ||
    userRole === ProjectRole.MANAGER ||
    userRole === ProjectRole.DEVELOPER;

  return (
    <LogsPageClient
      projectId={id}
      projectName={project.name}
      projectShortId={project.shortId}
      canDelete={canDelete}
      userId={session.user.id}
    />
  );
}
