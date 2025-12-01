"use client";

import { useState, useEffect } from "react";
import {
  Webhook,
  RefreshCw,
  CheckCircle,
  Clock,
  Search,
  Eye,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { ProjectHeader } from "@/components/projects/project-header";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface CallbackLog {
  id: string;
  url: string;
  method: string;
  requestHeaders?: Record<string, unknown>;
  requestBody?: unknown;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  responseTime?: number;
  error?: string;
  success: boolean;
  createdAt: string;
  callback: {
    id: string;
    name?: string | null;
    url: string;
    mockApi: {
      id: string;
      name?: string | null;
      path: string;
      method: string;
    };
  };
}

interface LogsResponse {
  logs: CallbackLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface CallbackLogsPageClientProps {
  projectId: string;
  projectName: string;
  projectShortId?: string;
  canDelete?: boolean;
  userId?: string;
}

export function CallbackLogsPageClient({
  projectId,
  projectName,
  projectShortId,
  canDelete = false,
}: CallbackLogsPageClientProps) {
  const [logs, setLogs] = useState<CallbackLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [successFilter, setSuccessFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<CallbackLog | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [page, successFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (successFilter !== "all") {
        params.append("success", successFilter);
      }

      if (searchKeyword) {
        params.append("keyword", searchKeyword);
      }

      const response = await fetch(
        `/api/projects/${projectId}/callback-logs?${params}`,
      );

      if (!response.ok) {
        throw new Error("获取回调日志失败");
      }

      const result = await response.json();
      const data: LogsResponse = result.data;

      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "获取回调日志失败",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadLogs();
  };

  const handleDeleteAll = async () => {
    if (!confirm("确定要删除该项目的所有回调日志吗？此操作不可恢复。")) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/callback-logs`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除失败");
      }

      toast.success("所有回调日志已删除");
      loadLogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy-MM-dd HH:mm:ss", {
        locale: zhCN,
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (log: CallbackLog) => {
    if (log.success) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          成功
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <XCircle className="h-3 w-3 mr-1" />
          失败
        </Badge>
      );
    }
  };

  const getMethodBadge = (method: string) => {
    const config = {
      GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
      POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
      PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
      DELETE: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    } as const;

    return (
      <Badge
        variant="outline"
        className={config[method as keyof typeof config] || config.GET}
      >
        {method}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <ProjectHeader
        projectId={projectId}
        projectName={projectName}
        title="回调日志"
        subtitle="查看 Mock API 触发的回调请求执行记录"
        projectShortId={projectShortId}
        icon={<Webhook className="h-5 w-5 text-white" />}
      />

      <div
        className={cn(
          "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
          "border border-slate-200/60 dark:border-slate-800/60",
          "rounded-xl shadow-sm",
          "p-6",
        )}
      >
        {/* 筛选栏 */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索回调 URL、Mock API..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={successFilter} onValueChange={setSuccessFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="true">成功</SelectItem>
                <SelectItem value="false">失败</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={loadLogs}
              disabled={loading}
              size="icon"
            >
              <RefreshCw
                className={cn("h-4 w-4", loading && "animate-spin")}
              />
            </Button>

            {canDelete && (
              <Button
                variant="outline"
                onClick={handleDeleteAll}
                disabled={loading || total === 0}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                清空日志
              </Button>
            )}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="flex items-center justify-between mb-4 text-sm text-slate-600 dark:text-slate-400">
          <span>
            共 {total} 条回调日志记录
            {logs.length > 0 &&
              ` (显示第 ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} 条)`}
          </span>
          <span>第 {page} / {totalPages} 页</span>
        </div>

        {/* 日志列表 */}
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Webhook className="h-12 w-12 text-slate-400 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  暂无回调日志记录
                </p>
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card
                key={log.id}
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* 展开按钮 */}
                    <button
                      onClick={() =>
                        setExpandedLogId(
                          expandedLogId === log.id ? null : log.id,
                        )
                      }
                      className="mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {expandedLogId === log.id ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* 状态行 */}
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(log)}
                        {getMethodBadge(log.method)}
                        {log.statusCode && (
                          <Badge variant="outline">{log.statusCode}</Badge>
                        )}
                        {log.responseTime !== undefined && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            {log.responseTime}ms
                          </span>
                        )}
                        <span className="text-xs text-slate-500 ml-auto">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>

                      {/* 回调信息 */}
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {log.callback.name || "未命名回调"}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          回调 URL: {log.url}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          触发自: {log.callback.mockApi.name || "未命名 Mock"} (
                          {log.callback.mockApi.method}{" "}
                          {log.callback.mockApi.path})
                        </div>
                      </div>

                      {log.error && (
                        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                          错误: {log.error}
                        </div>
                      )}

                      {/* 展开详情 */}
                      {expandedLogId === log.id && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                          <div>
                            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              请求头
                            </div>
                            <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.requestHeaders || {}, null, 2)}
                            </pre>
                          </div>

                          {Boolean(
                            log.requestBody &&
                              typeof log.requestBody === "object",
                          ) && (
                            <div>
                              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                请求体
                              </div>
                              <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.requestBody, null, 2)}
                              </pre>
                            </div>
                          )}

                          {Boolean(log.responseHeaders) && (
                            <div>
                              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                响应头
                              </div>
                              <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.responseHeaders, null, 2)}
                              </pre>
                            </div>
                          )}

                          {Boolean(log.responseBody) && (
                            <div>
                              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                响应体
                              </div>
                              <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                                {typeof log.responseBody === "string"
                                  ? log.responseBody
                                  : JSON.stringify(log.responseBody, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 查看按钮 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedLog(log)}
                      className="h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || loading}
            >
              上一页
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400 px-4">
              第 {page} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || loading}
            >
              下一页
            </Button>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>回调日志详情</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedLog)}
                {getMethodBadge(selectedLog.method)}
                {selectedLog.statusCode && (
                  <Badge variant="outline">{selectedLog.statusCode}</Badge>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">回调名称:</span>{" "}
                  {selectedLog.callback.name || "未命名"}
                </p>
                <p>
                  <span className="font-medium">回调 URL:</span>{" "}
                  {selectedLog.url}
                </p>
                <p>
                  <span className="font-medium">触发 Mock:</span>{" "}
                  {selectedLog.callback.mockApi.name ||
                    selectedLog.callback.mockApi.path}
                </p>
                <p>
                  <span className="font-medium">执行时间:</span>{" "}
                  {formatDate(selectedLog.createdAt)}
                </p>
                {selectedLog.responseTime !== undefined && (
                  <p>
                    <span className="font-medium">响应时间:</span>{" "}
                    {selectedLog.responseTime}ms
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
