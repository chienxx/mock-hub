import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectCollectionsPage({ params }: PageProps) {
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
      collections: {
        include: {
          _count: {
            select: {
              mockAPIs: true,
            },
          },
        },
        orderBy: [{ order: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  // 检查用户权限
  const isMember = project.members.length > 0;
  const isCreator = project.creatorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isAdmin && !isCreator && !isMember) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Link href={`/projects/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">分组管理</h1>
          <p className="text-sm text-muted-foreground">{project.name}</p>
        </div>
      </div>

      {/* 分组列表 */}
      <Card>
        <CardHeader>
          <CardTitle>API 分组</CardTitle>
          <CardDescription>管理 Mock API 的分组结构</CardDescription>
        </CardHeader>
        <CardContent>
          {project.collections.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
              <p>暂无分组</p>
            </div>
          ) : (
            <div className="space-y-2">
              {project.collections.map((collection) => (
                <div
                  key={collection.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{collection.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {collection._count.mockAPIs} 个接口
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
