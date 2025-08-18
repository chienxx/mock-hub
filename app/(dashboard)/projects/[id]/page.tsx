import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectRole } from "@prisma/client";
import Link from "next/link";
import {
  FileCode,
  FolderOpen,
  Clock,
  ExternalLink,
  Settings,
  Users,
  ChartBar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectHeader } from "@/components/projects/project-header";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  const { id } = await params;

  // 获取项目详情
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
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
              role: true,
            },
          },
        },
        take: 5,
        orderBy: { role: "desc" },
      },
      _count: {
        select: {
          mockAPIs: true,
          collections: true,
          members: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // 检查用户权限
  let userRole: ProjectRole | "ADMIN" | undefined;
  let isManager = false;

  // 检查系统管理员
  if (session.user.role === "ADMIN") {
    userRole = "ADMIN";
    isManager = true;
  } else {
    // 普通用户检查项目成员权限
    const member = project.members.find((m) => m.user.id === session.user.id);
    userRole = member?.role;

    // 如果用户不是系统管理员且不是项目成员，则无权访问
    if (!member) {
      notFound();
    }

    isManager = userRole === ProjectRole.MANAGER;
  }

  return (
    <div className="space-y-6">
      {/* 项目头部 - 使用 ProjectHeader 组件 */}
      <ProjectHeader
        projectName={project.name}
        projectShortId={project.shortId}
        title="项目概览"
        subtitle={
          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span>
              创建于 {new Date(project.createdAt).toLocaleDateString()}
            </span>
            <span>•</span>
            <span className="inline-flex items-center">
              创建者：
              <Avatar className="ml-1 h-5 w-5">
                <AvatarImage src={project.createdBy.avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {project.createdBy.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="ml-1">
                {project.createdBy.name || project.createdBy.email}
              </span>
            </span>
          </div>
        }
        icon={<FolderOpen className="h-5 w-5 text-white" />}
        projectId={project.id}
      >
        {isManager && (
          <>
            <Link href={`/projects/${project.id}/settings`}>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                项目设置
              </Button>
            </Link>
            <Link href={`/projects/${project.id}/members`}>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                成员管理
              </Button>
            </Link>
          </>
        )}
        <Link href={`/projects/${project.id}/mocks`}>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900">
            <FileCode className="mr-2 h-4 w-4" />
            Mock API
          </Button>
        </Link>
      </ProjectHeader>

      {/* 项目描述和基础URL */}
      <Card>
        <CardHeader>
          <CardTitle>项目信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.description && (
            <div>
              <p className="text-sm font-medium mb-1">描述</p>
              <p className="text-sm text-muted-foreground">
                {project.description}
              </p>
            </div>
          )}
          {project.proxyUrl && (
            <div>
              <p className="text-sm font-medium mb-1">代理 URL</p>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={project.proxyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {project.proxyUrl}
                </a>
              </div>
            </div>
          )}
          <div>
            <p className="text-sm font-medium mb-1">Mock 服务地址</p>
            <code className="text-sm bg-muted px-2 py-1 rounded">
              {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
              /api/mock/{project.shortId}/[path]
            </code>
          </div>
        </CardContent>
      </Card>

      {/* 统计信息 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mock API</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project._count.mockAPIs}</div>
            <p className="text-xs text-muted-foreground">已创建接口</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">分组</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project._count.collections}
            </div>
            <p className="text-xs text-muted-foreground">接口分组</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成员</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project._count.members || 0}
            </div>
            <p className="text-xs text-muted-foreground">项目成员</p>
          </CardContent>
        </Card>
      </div>

      {/* 项目成员 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>项目成员</CardTitle>
            <CardDescription>管理项目的团队成员</CardDescription>
          </div>
          {isManager && (
            <Link href={`/projects/${project.id}/members`}>
              <Button variant="outline" size="sm">
                查看全部
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {project.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.avatar || undefined} />
                    <AvatarFallback className="text-sm">
                      {member.user.name?.[0] || member.user.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {member.user.name || member.user.email}
                      {member.user.id === project.creatorId &&
                        member.user.role === "ADMIN" && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            （创建者）
                          </span>
                        )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    member.user.role === "ADMIN"
                      ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                      : member.role === ProjectRole.MANAGER
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                        : member.role === ProjectRole.DEVELOPER
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400"
                  }`}
                >
                  {member.user.role === "ADMIN"
                    ? "系统管理员"
                    : member.role === ProjectRole.MANAGER
                      ? "项目管理员"
                      : member.role === ProjectRole.DEVELOPER
                        ? "开发者"
                        : "访客"}
                </span>
              </div>
            ))}
            {(project._count.members || 0) > 5 && (
              <p className="text-sm text-center text-muted-foreground">
                还有 {(project._count.members || 0) - 5} 位成员...
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
          <CardDescription>常用功能快速入口</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href={`/projects/${project.id}/mocks/create`}>
              <Button variant="outline" className="w-full justify-start">
                <FileCode className="mr-2 h-4 w-4" />
                创建 Mock API
              </Button>
            </Link>
            <Link href={`/projects/${project.id}/logs`}>
              <Button variant="outline" className="w-full justify-start">
                <Clock className="mr-2 h-4 w-4" />
                查看调用日志
              </Button>
            </Link>
            <Link href={`/projects/${project.id}/analytics`}>
              <Button variant="outline" className="w-full justify-start">
                <ChartBar className="mr-2 h-4 w-4" />
                分析数据视图
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
