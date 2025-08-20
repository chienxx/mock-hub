"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  Filter,
  Search,
  Eye,
  ArrowUpRight,
  XCircle,
  ArrowRight,
  ArrowUpDown,
  FileText,
  Wifi,
  WifiOff,
  Trash2,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { ApiResponse } from "@/types/project";

interface APILog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  ip: string;
  userAgent?: string | null;
  isProxied: boolean;
  proxyUrl?: string | null;
  createdAt: string;
  mockApi: {
    id: string;
    name?: string | null;
    path: string;
    method: string;
  };
  query?: unknown;
  headers?: unknown;
  body?: unknown;
  responseHeaders?: unknown;
  responseBody?: unknown;
}

interface LogsResponse {
  logs: APILog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface LogsPageClientProps {
  projectId: string;
  projectName: string;
  projectShortId?: string;
  canDelete?: boolean;
  userId?: string;
}

export function LogsPageClient({
  projectId,
  projectName,
  projectShortId,
  canDelete = false,
}: LogsPageClientProps) {
  const [logs, setLogs] = useState<APILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [realTimeLogs, setRealTimeLogs] = useState<APILog[]>([]);
  const [isRealTime, setIsRealTime] = useState(false);
  const [selectedLog, setSelectedLog] = useState<APILog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null); // 使用ref存储EventSource
  const sseConnectedRef = useRef(false); // 使用ref来避免闭包问题

  // 筛选状态
  const [filters, setFilters] = useState({
    statusCode: "all",
    isProxied: "all",
    method: "all",
    page: 1,
    pageSize: 10,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  // 获取日志列表
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: filters.page.toString(),
        pageSize: filters.pageSize.toString(),
        ...(filters.statusCode &&
          filters.statusCode !== "all" && { statusCode: filters.statusCode }),
        ...(filters.isProxied &&
          filters.isProxied !== "all" && { isProxied: filters.isProxied }),
        ...(filters.method &&
          filters.method !== "all" && { method: filters.method }),
      });

      const response = await fetch(`/api/projects/${projectId}/logs?${params}`);
      const result: ApiResponse<LogsResponse> = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "获取日志失败");
      }

      if (result.data) {
        setLogs(result.data.logs);
        setPagination({
          total: result.data.total,
          totalPages: result.data.totalPages,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取日志失败");
    } finally {
      setLoading(false);
    }
  }, [projectId, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // 连接SSE实时日志
  const connectRealTime = () => {
    // 关闭旧连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // 重置连接状态
    sseConnectedRef.current = false;

    const source = new EventSource(`/api/projects/${projectId}/logs/stream`);

    // 立即保存引用，防止被垃圾回收
    eventSourceRef.current = source;

    source.onopen = () => {
      // 不在这里设置状态，等待connected消息
    };

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          // 使用ref来跟踪连接状态
          sseConnectedRef.current = true;
          setIsRealTime(true);
          setRealTimeLogs([]);
          toast.success("实时监控已开启");
        } else if (data.type === "api-log") {
          // 直接处理所有api-log消息
          setRealTimeLogs((prev) => {
            const newLogs = [data.data as APILog, ...prev].slice(0, 100);
            return newLogs;
          });
        } else if (data.type === "heartbeat") {
          // 心跳包，保持连接
        } else if (data.type === "ping") {
          // 初始ping，确认连接
        }
      } catch {}
    };

    source.onerror = () => {
      if (sseConnectedRef.current) {
        toast.error("实时监控连接断开，尝试重连...");
        // 自动重连
        setTimeout(() => {
          connectRealTime();
        }, 3000);
      } else {
        toast.error("无法建立实时监控连接");
      }
      sseConnectedRef.current = false;
      setIsRealTime(false);
      // 不要在这里关闭，让浏览器处理
    };

    // 不立即设置isRealTime，等待connected消息
  };

  // 断开SSE连接
  const disconnectRealTime = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsRealTime(false);
    setRealTimeLogs([]);
    toast.info("已关闭实时日志");
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 组件卸载时清理
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []); // 空依赖数组，只在组件卸载时运行

  // 导出日志
  const exportLogs = () => {
    const data = (isRealTime ? realTimeLogs : logs).map((log) => ({
      时间: new Date(log.createdAt).toLocaleString(),
      方法: log.method,
      路径: log.path,
      状态码: log.statusCode,
      响应时间: `${log.responseTime}ms`,
      IP: log.ip,
      代理: log.isProxied ? "是" : "否",
    }));

    const csv = [
      Object.keys(data[0] || {}).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `api-logs-${new Date().toISOString()}.csv`;
    link.click();
    toast.success("日志导出成功");
  };

  const getStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return {
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        icon: CheckCircle,
      };
    } else if (statusCode >= 400 && statusCode < 500) {
      return {
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        icon: AlertCircle,
      };
    } else if (statusCode >= 500) {
      return {
        className:
          "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800",
        icon: XCircle,
      };
    } else {
      return {
        className:
          "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200 dark:border-slate-800",
        icon: ArrowRight,
      };
    }
  };

  const getMethodBadge = (method: string) => {
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
    } as const;

    return (
      config[method as keyof typeof config]?.className ||
      "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200 dark:border-slate-800"
    );
  };

  const displayLogs = isRealTime ? realTimeLogs : logs;
  const filteredLogs = displayLogs.filter(
    (log) =>
      searchQuery === "" ||
      log.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ip.includes(searchQuery) ||
      log.method.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 删除日志
  const deleteLog = async (logId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/logs/${logId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (response.ok) {
        toast.success("日志已删除");
        // 从列表中移除
        setLogs((prev) => prev.filter((log) => log.id !== logId));
        setRealTimeLogs((prev) => prev.filter((log) => log.id !== logId));
      } else {
        toast.error(result.message || "删除失败");
      }
    } catch {
      toast.error("删除日志失败");
    }
  };

  return (
    <div className="space-y-6">
      {/* 项目头部导航 */}
      <ProjectHeader
        projectName={projectName}
        projectShortId={projectShortId}
        projectId={projectId}
        title="API 调用日志"
        subtitle="监控和分析接口调用情况"
        icon={<FileText className="h-5 w-5 text-white" />}
        backToFunctionPage="/logs"
      >
        {isRealTime ? (
          <Button
            onClick={disconnectRealTime}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <WifiOff className="mr-2 h-4 w-4" />
            断开实时
          </Button>
        ) : (
          <Button onClick={connectRealTime}>
            <Wifi className="mr-2 h-4 w-4" />
            实时监控
          </Button>
        )}
        <Button
          variant="outline"
          onClick={fetchLogs}
          disabled={loading || isRealTime}
          className="border-slate-200 dark:border-slate-700"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新
        </Button>
        <Button
          variant="outline"
          onClick={exportLogs}
          disabled={displayLogs.length === 0}
          className="border-slate-200 dark:border-slate-700"
        >
          <Download className="mr-2 h-4 w-4" />
          导出
        </Button>
      </ProjectHeader>

      {/* 筛选栏 */}
      <div
        className={cn(
          "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
          "border border-slate-200/60 dark:border-slate-800/60",
          "rounded-xl p-4",
          "shadow-sm",
        )}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索路径、IP、方法..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                disabled={isRealTime}
              />
            </div>
          </div>

          {/* 筛选器 */}
          {!isRealTime && (
            <>
              <Select
                value={filters.method}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, method: value, page: 1 }))
                }
              >
                <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <Filter className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue placeholder="方法" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部方法</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.statusCode}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    statusCode: value,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue placeholder="状态码" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="200">2xx 成功</SelectItem>
                  <SelectItem value="400">4xx 客户端错误</SelectItem>
                  <SelectItem value="500">5xx 服务器错误</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.isProxied}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, isProxied: value, page: 1 }))
                }
              >
                <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <Globe className="w-3.5 h-3.5 mr-1.5" />
                  <SelectValue placeholder="代理" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="true">已代理</SelectItem>
                  <SelectItem value="false">未代理</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* 实时状态指示器 */}
        {isRealTime && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                实时监控中
              </span>
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              已接收 {realTimeLogs.length} 条日志
            </span>
          </div>
        )}
      </div>

      {/* 日志列表 */}
      <div
        className={cn(
          "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
          "border border-slate-200/60 dark:border-slate-800/60",
          "rounded-xl",
          "shadow-sm",
          "overflow-hidden",
        )}
      >
        {loading && !isRealTime ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                加载日志中...
              </p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <Activity className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {isRealTime ? "等待新的日志..." : "暂无日志记录"}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* 表头 */}
            <div className="grid grid-cols-12 items-center gap-3 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-600 dark:text-slate-400">
              <div className="col-span-1">方法</div>
              <div className="col-span-4">路径</div>
              <div className="col-span-1">状态</div>
              <div className="col-span-1">耗时</div>
              <div className="col-span-1">IP地址</div>
              <div className="col-span-1">代理</div>
              <div className="col-span-2">时间</div>
              <div className="col-span-1 text-center">操作</div>
            </div>

            {/* 数据行 */}
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredLogs.map((log) => {
                const statusConfig = getStatusBadge(log.statusCode);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={log.id}
                    className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="grid grid-cols-12 items-center gap-3 px-4 py-2.5">
                      {/* 方法 - 1列 */}
                      <div className="col-span-1">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-md border min-w-[45px]",
                            getMethodBadge(log.method),
                          )}
                        >
                          {log.method}
                        </span>
                      </div>

                      {/* 路径 - 4列 */}
                      <div className="col-span-4">
                        <code
                          className="text-sm font-mono text-slate-900 dark:text-slate-100 truncate block"
                          title={log.path}
                        >
                          {log.path}
                        </code>
                      </div>

                      {/* 状态码 - 1列 */}
                      <div className="col-span-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border",
                            statusConfig.className,
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {log.statusCode}
                        </span>
                      </div>

                      {/* 响应时间 - 1列 */}
                      <div className="col-span-1 text-xs text-slate-600 dark:text-slate-400">
                        {log.responseTime}ms
                      </div>

                      {/* IP地址 - 1列 */}
                      <div className="col-span-1 text-xs text-slate-600 dark:text-slate-400">
                        {log.ip}
                      </div>

                      {/* 代理状态 - 1列 */}
                      <div className="col-span-1">
                        {log.isProxied ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>已代理</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-500">
                            -
                          </span>
                        )}
                      </div>

                      {/* 时间 - 2列 */}
                      <div className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </div>

                      {/* 操作 - 1列 */}
                      <div className="col-span-1 flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="h-7 px-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("确定要删除这条日志吗？")) {
                                deleteLog(log.id);
                              }
                            }}
                            className="h-7 px-2 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 分页 */}
        {!isRealTime && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              共 {pagination.total} 条记录
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                disabled={filters.page === 1}
                className="border-slate-200 dark:border-slate-700"
              >
                上一页
              </Button>
              <span className="px-3 text-sm text-slate-600 dark:text-slate-400">
                {filters.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    page: Math.min(pagination.totalPages, prev.page + 1),
                  }))
                }
                disabled={filters.page === pagination.totalPages}
                className="border-slate-200 dark:border-slate-700"
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 日志详情对话框 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>日志详情</DialogTitle>
            <DialogDescription>
              {selectedLog &&
                new Date(selectedLog.createdAt).toLocaleString("zh-CN")}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <Tabs defaultValue="request" className="mt-6">
              <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
                <TabsTrigger
                  value="request"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
                >
                  请求信息
                </TabsTrigger>
                <TabsTrigger
                  value="response"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
                >
                  响应信息
                </TabsTrigger>
                <TabsTrigger
                  value="meta"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
                >
                  元数据
                </TabsTrigger>
              </TabsList>

              <TabsContent value="request" className="space-y-4 mt-6">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      请求方法
                    </label>
                    <div className="mt-1">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-md border",
                          getMethodBadge(selectedLog.method),
                        )}
                      >
                        {selectedLog.method}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      请求路径
                    </label>
                    <div className="mt-1 font-mono text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                      {selectedLog.path}
                    </div>
                  </div>

                  {selectedLog.query ? (
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        查询参数
                      </label>
                      <pre className="mt-1 text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(selectedLog.query, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  {selectedLog.headers ? (
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        请求头
                      </label>
                      <pre className="mt-1 text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(selectedLog.headers, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  {selectedLog.body ? (
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        请求体
                      </label>
                      <pre className="mt-1 text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(selectedLog.body, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="response" className="space-y-4 mt-6">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      状态码
                    </label>
                    <div className="mt-1">
                      {(() => {
                        const config = getStatusBadge(selectedLog.statusCode);
                        const Icon = config.icon;
                        return (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-md border",
                              config.className,
                            )}
                          >
                            <Icon className="w-3 h-3" />
                            {selectedLog.statusCode}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      响应时间
                    </label>
                    <div className="mt-1 flex items-center gap-1 text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {selectedLog.responseTime}ms
                    </div>
                  </div>

                  {selectedLog.responseHeaders ? (
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        响应头
                      </label>
                      <pre className="mt-1 text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(selectedLog.responseHeaders, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  {selectedLog.responseBody ? (
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        响应体
                      </label>
                      <pre className="mt-1 text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(selectedLog.responseBody, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="meta" className="space-y-4 mt-6">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      客户端 IP
                    </label>
                    <div className="mt-1 text-sm bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
                      {selectedLog.ip}
                    </div>
                  </div>

                  {selectedLog.userAgent && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        User Agent
                      </label>
                      <div className="mt-1 text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg break-all">
                        {selectedLog.userAgent}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      代理状态
                    </label>
                    <div className="mt-1">
                      {selectedLog.isProxied ? (
                        <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                          已代理
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-slate-200 dark:border-slate-700"
                        >
                          未代理
                        </Badge>
                      )}
                    </div>
                  </div>

                  {selectedLog.proxyUrl && (
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        代理 URL
                      </label>
                      <div className="mt-1 text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg break-all">
                        {selectedLog.proxyUrl}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Mock API
                    </label>
                    <div className="mt-1 text-sm bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
                      {selectedLog.mockApi.name || selectedLog.mockApi.path}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
