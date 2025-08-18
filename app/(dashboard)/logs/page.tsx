import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  FolderOpen,
  Clock,
  ChevronRight,
  Plus,
  FileText,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export default async function LogsRedirectPage() {
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
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 获取每个项目的日志数量
  const projectsWithLogCount = await Promise.all(
    projects.map(async (project) => {
      const logCount = await prisma.aPILog.count({
        where: {
          mockApi: {
            projectId: project.id,
          },
        },
      });
      return {
        ...project,
        _count: {
          ...project._count,
          logs: logCount,
        },
      };
    }),
  );

  // 如果只有一个项目，直接跳转
  if (projectsWithLogCount.length === 1) {
    redirect(`/projects/${projectsWithLogCount[0].id}/logs`);
  }

  // 如果没有项目，跳转到项目列表
  if (projectsWithLogCount.length === 0) {
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
              请选择要查看日志的项目
            </p>
          </div>
        </div>

        {canCreateProject && (
          <Link href="/projects">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900">
              <Plus className="mr-2 h-4 w-4" />
              创建新项目
            </Button>
          </Link>
        )}
      </div>

      {/* 项目卡片网格 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projectsWithLogCount.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}/logs`}
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
                    {/* 日志数量 */}
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {project._count.logs || 0} 条日志
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
            <BarChart3 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              API 日志监控
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              选择一个项目来查看其 API
              调用日志。您可以实时监控接口调用情况，分析响应时间和错误率，帮助优化接口性能。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
