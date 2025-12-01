"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}

interface MockCallback {
  id: string;
  name?: string | null;
  url: string;
  method: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mockApiId: string;
  projectId: string;
  callback: MockCallback | null;
}

export function CallbackLogsDialog({
  open,
  onClose,
  mockApiId,
  projectId,
  callback,
}: Props) {
  const [logs, setLogs] = useState<CallbackLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (open && callback) {
      loadLogs();
    }
  }, [open, callback, filter, page]);

  const loadLogs = async () => {
    if (!callback) return;

    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });

      if (filter !== "all") {
        params.append("success", filter === "success" ? "true" : "false");
      }

      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockApiId}/callbacks/${callback.id}/logs?${params}`,
      );

      if (!response.ok) {
        throw new Error("获取回调日志失败");
      }

      const result = await response.json();
      setLogs(result.data?.logs || []);
      setTotalPages(result.data?.totalPages || 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "获取回调日志失败",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MM-dd HH:mm:ss", { locale: zhCN });
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
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            回调执行日志 - {callback?.name || callback?.url}
          </DialogTitle>
        </DialogHeader>

        {/* 筛选栏 */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-400">
            共 {logs.length} 条日志
          </div>
        </div>

        {/* 日志列表 */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && logs.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"
                />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  暂无日志记录
                </p>
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* 日志概要 */}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() =>
                        setExpandedLog(expandedLog === log.id ? null : log.id)
                      }
                      className="mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {expandedLog === log.id ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
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

                      <div className="text-sm text-slate-600 dark:text-slate-400 truncate mb-1">
                        {log.url}
                      </div>

                      {log.error && (
                        <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                          错误: {log.error}
                        </div>
                      )}

                      {/* 展开内容 */}
                      {expandedLog === log.id && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                          {/* 请求信息 */}
                          <div>
                            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              请求头
                            </div>
                            <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.requestHeaders || {}, null, 2)}
                            </pre>
                          </div>

                          {Boolean(log.requestBody && typeof log.requestBody === "object") && (
                            <div>
                              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                请求体
                              </div>
                              <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.requestBody, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* 响应信息 */}
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
                                {(() => {
                                  if (typeof log.responseBody === "string") {
                                    return log.responseBody;
                                  }
                                  return JSON.stringify(log.responseBody, null, 2);
                                })()}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || loading}
            >
              上一页
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              第 {page} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || loading}
            >
              下一页
            </Button>
          </div>
        )}

        {/* 关闭按钮 */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
