import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectRole } from "@prisma/client";
import { Settings } from "lucide-react";
import { ProjectHeader } from "@/components/projects/project-header";
import SettingsClient from "./SettingsClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectSettingsPage({ params }: PageProps) {
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
  const member = project.members[0];
  const userRole = member?.role;
  const isCreator = project.creatorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  // 如果用户不是系统管理员、创建者或项目成员，则无权访问
  if (!isAdmin && !isCreator && !member) {
    notFound();
  }

  // 系统管理员或项目管理员可以管理项目
  const canManageProject = isAdmin || userRole === ProjectRole.MANAGER;
  // 系统管理员或项目创建者可以删除项目
  const canDeleteProject = isAdmin || isCreator;

  return (
    <div className="space-y-6">
      <ProjectHeader
        projectName={project.name}
        projectShortId={project.shortId}
        title="项目设置"
        subtitle="管理项目的基本信息和配置"
        icon={<Settings className="h-5 w-5 text-white" />}
        projectId={project.id}
      />

      <SettingsClient
        projectId={project.id}
        canManageProject={canManageProject}
        canDeleteProject={canDeleteProject}
      />
    </div>
  );
}
