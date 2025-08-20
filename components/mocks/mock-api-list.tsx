"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Play,
  Pause,
  Copy,
  Trash2,
  MoreHorizontal,
  Edit,
  CheckCircle,
  Filter,
  Globe,
  Zap,
  Settings,
  Code2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HTTPMethod, ProxyMode } from "@prisma/client";
import type { MockAPI, ApiResponse, PaginatedResponse } from "@/types/mock";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { config } from "@/lib/config";

interface Props {
  projectId: string;
  projectShortId: string;
  canManage: boolean;
  selectedCollectionId?: string | null;
}

export function MockAPIList({
  projectId,
  projectShortId,
  canManage,
  selectedCollectionId,
}: Props) {
  const [mockAPIs, setMockAPIs] = useState<MockAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMockAPIs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "10",
        search,
        method: methodFilter === "ALL" ? "" : methodFilter,
        collection:
          selectedCollectionId === "uncategorized"
            ? "NONE"
            : selectedCollectionId || "",
        enabled: statusFilter === "ALL" ? "" : statusFilter,
      });

      const response = await fetch(
        `/api/projects/${projectId}/mocks?${params}`,
      );
      const result: ApiResponse<PaginatedResponse<MockAPI>> =
        await response.json();

      if (!response.ok) {
        throw new Error(result.message || "获取 Mock API 列表失败");
      }

      setMockAPIs(result.data?.items || []);
      setTotalPages(
        Math.ceil((result.data?.total || 0) / (result.data?.pageSize || 10)),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "获取 Mock API 列表失败",
      );
    } finally {
      setLoading(false);
    }
  };

  // 分组切换时重置页码
  useEffect(() => {
    setPage(1);
  }, [selectedCollectionId]);

  // 页码或分组变化时自动查询
  useEffect(() => {
    fetchMockAPIs();
  }, [page, projectId, selectedCollectionId, methodFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setPage(1);
    fetchMockAPIs();
  };

  const handleToggleEnabled = async (mockAPI: MockAPI) => {
    if (!canManage) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockAPI.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !mockAPI.enabled }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "更新状态失败");
      }

      toast.success(mockAPI.enabled ? "Mock API 已禁用" : "Mock API 已启用");
      fetchMockAPIs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新状态失败");
    }
  };

  const handleDelete = async (mockAPI: MockAPI) => {
    if (!canManage) return;

    if (
      !confirm(`确定要删除 Mock API "${mockAPI.name || mockAPI.path}" 吗？`)
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockAPI.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "删除失败");
      }

      toast.success("Mock API 删除成功");
      fetchMockAPIs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  };

  const copyMockUrl = async (mockAPI: MockAPI) => {
    try {
      const mockUrl = config.getMockApiUrl(projectShortId, mockAPI.path);

      // 使用改进的复制逻辑，兼容 HTTP 环境
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(mockUrl);
      } else {
        // 降级方案：使用 execCommand
        const textArea = document.createElement("textarea");
        textArea.value = mockUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        textArea.setSelectionRange(0, 99999);

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error("复制失败");
        }
      }

      setCopiedId(mockAPI.id);
      toast.success("Mock URL 已复制到剪贴板");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  const getMethodBadge = (method: HTTPMethod) => {
    const config = {
      GET: {
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      },
      POST: {
        className:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      },
      PUT: {
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      },
      DELETE: {
        className:
          "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800",
      },
      PATCH: {
        className:
          "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      },
      HEAD: {
        className:
          "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800",
      },
      OPTIONS: {
        className:
          "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200 dark:border-slate-800",
      },
    } as const;

    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-md border",
          config[method]?.className || config.GET.className,
        )}
      >
        {method}
      </span>
    );
  };

  const getProxyModeBadge = (proxyMode: ProxyMode) => {
    const config = {
      MOCK: {
        label: "Mock",
        icon: Zap,
        className:
          "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 border-violet-200 dark:border-violet-800",
      },
      PROXY: {
        label: "Proxy",
        icon: Globe,
        className:
          "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
      },
      AUTO: {
        label: "Auto",
        icon: Settings,
        className:
          "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200 dark:border-slate-800",
      },
    };

    const { label, icon: Icon, className } = config[proxyMode];
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border",
          className,
        )}
      >
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div
        className={cn(
          "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
          "border border-slate-200/60 dark:border-slate-800/60",
          "rounded-xl p-6",
          "shadow-sm",
        )}
      >
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 筛选器 */}
      <div
        className={cn(
          "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
          "border border-slate-200/60 dark:border-slate-800/60",
          "rounded-xl p-4",
          "shadow-sm",
        )}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="搜索 API 路径或名称..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>
              <Button onClick={handleSearch}>查询</Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[110px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                <SelectValue placeholder="方法" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部方法</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[110px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="true">已启用</SelectItem>
                <SelectItem value="false">已禁用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Mock API 列表 */}
      <div className="space-y-3">
        {mockAPIs.length === 0 ? (
          <div
            className={cn(
              "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
              "border border-slate-200/60 dark:border-slate-800/60",
              "rounded-xl py-12",
              "shadow-sm",
            )}
          >
            <div className="text-center">
              <Code2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                暂无 Mock API
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                点击上方&quot;创建 Mock API&quot;按钮开始
              </p>
            </div>
          </div>
        ) : (
          mockAPIs.map((mockAPI) => (
            <div
              key={mockAPI.id}
              className={cn(
                "group relative",
                "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
                "border border-slate-200/60 dark:border-slate-800/60",
                "rounded-xl p-4",
                "shadow-sm hover:shadow-md",
                "transition-all duration-200",
                !mockAPI.enabled && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* 第一行：方法、路径、代理模式 */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {getMethodBadge(mockAPI.method)}
                    <code
                      className={cn(
                        "text-sm font-mono px-2.5 py-0.5 rounded-md",
                        "bg-slate-100 dark:bg-slate-800",
                        "text-slate-700 dark:text-slate-300",
                      )}
                    >
                      {mockAPI.path}
                    </code>
                    {getProxyModeBadge(mockAPI.proxyMode)}
                    {!mockAPI.enabled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800">
                        <AlertCircle className="w-3 h-3" />
                        已禁用
                      </span>
                    )}
                  </div>

                  {/* 第二行：名称和描述 */}
                  {(mockAPI.name || mockAPI.description) && (
                    <div className="space-y-1">
                      {mockAPI.name && (
                        <p className="font-medium text-slate-900 dark:text-white">
                          {mockAPI.name}
                        </p>
                      )}
                      {mockAPI.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                          {mockAPI.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 第三行：元信息 */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    {mockAPI.responseDelay && mockAPI.responseDelay > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        延迟: {mockAPI.responseDelay}ms
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDistanceToNow(new Date(mockAPI.createdAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyMockUrl(mockAPI)}
                    className={cn(
                      "h-8 w-8 p-0",
                      copiedId === mockAPI.id && "text-emerald-600",
                    )}
                  >
                    {copiedId === mockAPI.id ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>

                  {canManage && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleEnabled(mockAPI)}
                        className="h-8 w-8 p-0"
                      >
                        {mockAPI.enabled ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/projects/${projectId}/mocks/${mockAPI.id}`}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400"
                            onClick={() => handleDelete(mockAPI)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700"
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
                  className="w-8 h-8 p-0"
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
                  className="w-8 h-8 p-0 bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700"
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700"
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
