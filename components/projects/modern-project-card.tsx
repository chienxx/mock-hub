"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Settings,
  Users,
  FileCode,
  Activity,
  Trash2,
  Globe,
  Clock,
  Network,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectRole } from "@prisma/client";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface ModernProjectCardProps {
  project: Project;
  onDelete?: () => void;
}

export function ModernProjectCard({
  project,
  onDelete,
}: ModernProjectCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`确定要删除项目 "${project.name}" 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "删除项目失败");
      }

      toast.success("项目删除成功");
      onDelete?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除项目失败");
    } finally {
      setDeleting(false);
    }
  };

  const isManager =
    project.userRole === "ADMIN" || project.userRole === ProjectRole.MANAGER;

  const getStatusConfig = () => {
    switch (project.status) {
      case "ACTIVE":
        return {
          label: "活跃",
          className:
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
          dotColor: "bg-emerald-500",
        };
      case "ARCHIVED":
        return {
          label: "已归档",
          className:
            "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
          dotColor: "bg-slate-400",
        };
      case "DISABLED":
        return {
          label: "已禁用",
          className:
            "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800",
          dotColor: "bg-red-500",
        };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div
      className={cn(
        "group relative",
        "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
        "border border-slate-200/60 dark:border-slate-800/60",
        "rounded-xl shadow-sm",
        "hover:shadow-md hover:border-slate-300/60 dark:hover:border-slate-700/60",
        "transition-all duration-200 cursor-pointer",
        "overflow-hidden",
      )}
      onClick={() => router.push(`/projects/${project.id}`)}
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
              {statusConfig && (
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      statusConfig.dotColor,
                    )}
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {statusConfig.label}
                  </span>
                </div>
              )}
            </div>

            {/* 项目ID */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">
                {project.shortId}
              </code>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(project.createdAt), {
                  addSuffix: true,
                  locale: zhCN,
                })}
              </div>
            </div>
          </div>

          {/* 操作菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/projects/${project.id}/mocks`);
                }}
              >
                <FileCode className="mr-2 h-4 w-4" />
                Mock API
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/projects/${project.id}/logs`);
                }}
              >
                <Activity className="mr-2 h-4 w-4" />
                查看日志
              </DropdownMenuItem>

              {isManager && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/projects/${project.id}/settings`);
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    项目设置
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/projects/${project.id}/members`);
                    }}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    成员管理
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 dark:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    disabled={deleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除项目
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 描述 */}
        {project.description && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {project.description}
          </p>
        )}
      </div>

      {/* 统计信息 */}
      <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mock API 数量 */}
            <div className="flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {project._count?.mockAPIs || 0} 接口
              </span>
            </div>

            {/* 成员数量 */}
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {project.members?.length || 1} 成员
              </span>
            </div>
          </div>

          {/* 代理地址 */}
          {project.proxyUrl && (
            <div
              className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="w-3 h-3" />
              <a
                href={project.proxyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors truncate max-w-[120px]"
                title={project.proxyUrl}
              >
                {new URL(project.proxyUrl).hostname}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
