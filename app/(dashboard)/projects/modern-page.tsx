"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  FolderOpen,
  Plus,
  Filter,
  Grid3x3,
  List,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateProjectDialog } from "@/components/projects/create-dialog";
import { ModernProjectCard } from "@/components/projects/modern-project-card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Project, ApiResponse, PaginatedResponse } from "@/types/project";

export default function ModernProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const canCreateProject = session?.user?.role === "ADMIN";

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "9",
        search,
        status,
      });

      const response = await fetch(`/api/projects?${params}`);
      const result: ApiResponse<PaginatedResponse<Project>> =
        await response.json();

      if (!response.ok) {
        throw new Error(result.message || "获取项目列表失败");
      }

      setProjects(result.data?.items || []);
      setTotalPages(result.data?.totalPages || 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取项目列表失败");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearch = () => {
    setPage(1);
    fetchProjects();
  };

  return (
    <div className="min-h-screen">
      {/* 页面背景装饰 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10" />
      </div>

      <div className="relative space-y-6 p-6">
        {/* 页面标题 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FolderOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                项目管理
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                管理和配置您的 Mock API 项目
              </p>
            </div>
          </div>

          {canCreateProject && (
            <CreateProjectDialog onSuccess={fetchProjects}>
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                <Plus className="mr-2 h-4 w-4" />
                创建项目
              </Button>
            </CreateProjectDialog>
          )}
        </div>

        {/* 搜索和筛选栏 */}
        <div
          className={cn(
            "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
            "border border-slate-200/60 dark:border-slate-800/60",
            "rounded-xl shadow-sm p-4",
          )}
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="搜索项目名称、描述或ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
              >
                搜索
              </Button>
            </div>

            {/* 筛选和视图切换 */}
            <div className="flex items-center gap-2">
              {/* 状态筛选 */}
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[140px] bg-white/50 dark:bg-slate-800/50">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部状态</SelectItem>
                  <SelectItem value="ACTIVE">活跃</SelectItem>
                  <SelectItem value="ARCHIVED">已归档</SelectItem>
                  <SelectItem value="DISABLED">已禁用</SelectItem>
                </SelectContent>
              </Select>

              {/* 视图切换 */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "px-3 h-8",
                    viewMode === "grid" &&
                      "bg-white dark:bg-slate-700 shadow-sm",
                  )}
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "px-3 h-8",
                    viewMode === "list" &&
                      "bg-white dark:bg-slate-700 shadow-sm",
                  )}
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
              <p className="text-sm text-slate-500">加载中...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div
            className={cn(
              "min-h-[400px] flex items-center justify-center",
              "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
              "border border-slate-200/60 dark:border-slate-800/60",
              "rounded-xl shadow-sm",
            )}
          >
            <div className="text-center space-y-4 p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-full flex items-center justify-center mx-auto">
                <FolderOpen className="w-10 h-10 text-slate-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {search ? "没有找到匹配的项目" : "暂无项目"}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                  {search
                    ? "尝试调整搜索关键词或筛选条件"
                    : canCreateProject
                      ? '点击上方"创建项目"按钮开始创建您的第一个 Mock API 项目'
                      : "请联系管理员为您创建项目"}
                </p>
              </div>
              {!search && canCreateProject && (
                <CreateProjectDialog onSuccess={fetchProjects}>
                  <Button variant="outline" size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    创建第一个项目
                  </Button>
                </CreateProjectDialog>
              )}
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                  : "space-y-4",
              )}
            >
              {projects.map((project) => (
                <ModernProjectCard
                  key={project.id}
                  project={project}
                  onDelete={fetchProjects}
                />
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="bg-white/80 dark:bg-slate-900/80"
                >
                  上一页
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={cn(
                          "w-8 h-8 p-0",
                          pageNum === page
                            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                            : "bg-white/80 dark:bg-slate-900/80",
                        )}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="text-slate-400">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(totalPages)}
                        className="w-8 h-8 p-0 bg-white/80 dark:bg-slate-900/80"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="bg-white/80 dark:bg-slate-900/80"
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
