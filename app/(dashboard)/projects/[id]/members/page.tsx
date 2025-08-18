import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectRole } from "@prisma/client";
import { Users } from "lucide-react";
import { ProjectHeader } from "@/components/projects/project-header";
import MembersClient from "./MembersClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectMembersPage({ params }: PageProps) {
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

  // 系统管理员或项目管理员可以管理成员
  const canManageMembers = isAdmin || userRole === ProjectRole.MANAGER;

  return (
    <div className="space-y-6">
      <ProjectHeader
        projectName={project.name}
        projectShortId={project.shortId}
        title="成员管理"
        subtitle="管理项目成员及其权限"
        icon={<Users className="h-5 w-5 text-white" />}
        projectId={project.id}
      />

      <MembersClient
        projectId={project.id}
        projectName={project.name}
        canManageMembers={canManageMembers}
        currentUserId={session.user.id}
      />
    </div>
  );
}
