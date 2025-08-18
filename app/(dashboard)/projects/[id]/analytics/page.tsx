import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnalyticsPageClient } from "./AnalyticsPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectAnalyticsPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const { id } = await params;

  // 获取项目
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

  // 检查权限
  const isMember = project.members.length > 0;
  const isCreator = project.creatorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isAdmin && !isCreator && !isMember) {
    notFound();
  }

  return (
    <AnalyticsPageClient
      projectId={id}
      projectName={project.name}
      projectShortId={project.shortId}
    />
  );
}
