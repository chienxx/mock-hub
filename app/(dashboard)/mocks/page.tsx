import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  FolderOpen,
  Network,
  Users,
  Clock,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export default async function MocksRedirectPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // 获取用户的所有项目
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { creatorId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      description: true,
      shortId: true,
      updatedAt: true,
      createdAt: true,
      _count: {
        select: {
          mockAPIs: true,
          members: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 如果只有一个项目，直接跳转
  if (projects.length === 1) {
    redirect(`/projects/${projects[0].id}/mocks`);
  }

  // 如果没有项目，跳转到项目列表
  if (projects.length === 0) {
    redirect("/projects");
  }

  const canCreateProject = session?.user?.role === "ADMIN";

  // 如果有多个项目，显示选择页面
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              选择项目
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              请选择要管理 Mock API 的项目
            </p>
          </div>
        </div>

        {canCreateProject && (
          <Link href="/projects">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建新项目
            </Button>
          </Link>
        )}
      </div>

      {/* 项目卡片网格 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}/mocks`}
            className="group block"
          >
            <div
              className={cn(
                "relative h-full",
                "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
                "border border-slate-200/60 dark:border-slate-800/60",
                "rounded-xl shadow-sm",
                "hover:shadow-md hover:border-slate-300/60 dark:hover:border-slate-700/60",
                "transition-all duration-200",
                "overflow-hidden",
              )}
            >
              {/* 顶部装饰条 */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-slate-900 dark:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* 头部 */}
              <div className="p-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* 标题行 */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                        {project.name}
                      </h3>
                    </div>

                    {/* 项目ID */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">
                        {project.shortId}
                      </code>
                      <span>·</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(project.updatedAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </div>
                    </div>

                    {/* 描述 */}
                    {project.description && (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* 右侧箭头 */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Mock API 数量 */}
                    <div className="flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {project._count.mockAPIs} 接口
                      </span>
                    </div>

                    {/* 成员数量 */}
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {project._count.members} 成员
                      </span>
                    </div>
                  </div>

                  {/* 创建时间 */}
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    创建于{" "}
                    {new Date(project.createdAt).toLocaleDateString("zh-CN")}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 提示信息 */}
      <div
        className={cn(
          "mt-8 p-4",
          "bg-slate-50/50 dark:bg-slate-900/50",
          "border border-slate-200/60 dark:border-slate-800/60",
          "rounded-xl",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <Network className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Mock API 管理
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              选择一个项目来管理其 Mock API 接口。您可以创建、编辑和测试 Mock
              接口，配置响应规则和代理设置。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
