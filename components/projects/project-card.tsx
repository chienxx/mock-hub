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
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectRole } from "@prisma/client";
import type { Project } from "@/types/project";

interface ProjectCardProps {
  project: Project;
  onDelete?: () => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
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

  const getStatusBadge = () => {
    switch (project.status) {
      case "ACTIVE":
        return (
          <Badge variant="default" className="text-xs">
            活跃
          </Badge>
        );
      case "ARCHIVED":
        return (
          <Badge variant="secondary" className="text-xs">
            已归档
          </Badge>
        );
      case "DISABLED":
        return (
          <Badge variant="destructive" className="text-xs">
            已禁用
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer relative group"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {project.name}
              </span>
              {getStatusBadge()}
            </CardTitle>
            <CardDescription className="text-xs">
              {project.shortId} · 创建于{" "}
              {new Date(project.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/projects/${project.id}/mocks`)}
                disabled={project.status === "DISABLED" && !isManager}
              >
                <FileCode className="mr-2 h-4 w-4" />
                查看 Mock API
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/projects/${project.id}/logs`)}
              >
                <Activity className="mr-2 h-4 w-4" />
                查看日志
              </DropdownMenuItem>
              {isManager && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/projects/${project.id}/settings`)
                    }
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    项目设置
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/projects/${project.id}/members`)
                    }
                  >
                    <Users className="mr-2 h-4 w-4" />
                    成员管理
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={handleDelete}
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
      </CardHeader>
      <CardContent className="space-y-4">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}

        {project.proxyUrl && (
          <div
            className="flex items-center text-xs text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            <span className="truncate">{project.proxyUrl}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <FileCode className="mr-1 h-4 w-4 text-muted-foreground" />
              <span>{project._count?.mockAPIs || 0} 接口</span>
            </div>
            <div className="flex items-center">
              <Users className="mr-1 h-4 w-4 text-muted-foreground" />
              <span>{project._count?.collections || 0} 分组</span>
            </div>
          </div>
          <div className="flex items-center">
            <Avatar className="h-6 w-6">
              <AvatarImage src={project.createdBy.avatar || undefined} />
              <AvatarFallback className="text-xs">
                {project.createdBy.name?.[0] ||
                  project.createdBy.email?.[0] ||
                  "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
            {project.userRole === "ADMIN"
              ? "系统管理员"
              : project.userRole === ProjectRole.MANAGER
                ? "项目管理员"
                : project.userRole === ProjectRole.DEVELOPER
                  ? "开发者"
                  : "访客"}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              更新于 {new Date(project.updatedAt).toLocaleDateString()}
            </span>
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              点击查看详情 →
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
