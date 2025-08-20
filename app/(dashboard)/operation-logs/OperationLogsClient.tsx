"use client";

import { useState, useEffect, useCallback } from "react";
import { OperationType } from "@prisma/client";
import {
  Search,
  Download,
  RefreshCw,
  User,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  Network,
  Users,
  FolderOpen,
  History,
  Eye,
  Database,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getOperationTypeLabel, getModuleLabel } from "@/lib/services/operation-log-service";
import { cn } from "@/lib/utils";

interface OperationLog {
  id: string;
  userId: string;
  type: OperationType;
  module: string;
  action: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
  user: {
    id: string;
    name?: string;
    email: string;
    role: string;
  };
}

interface OperationLogsClientProps {
  userRole?: string;
}

export function OperationLogsClient({ userRole }: OperationLogsClientProps) {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);
  
  // 筛选条件
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  // 分页
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });

  // 统计数据
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    todayCount: 0,
  });

  // 获取日志列表
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (searchQuery) params.append("search", searchQuery);
      if (selectedModule !== "all") params.append("module", selectedModule);
      if (selectedStatus !== "all") params.append("status", selectedStatus);

      const response = await fetch(`/api/operation-logs?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "获取日志失败");
      }

      setLogs(result.data.logs);
      setPagination(result.data.pagination);
      
      // 计算统计数据
      const total = result.data.pagination.total;
      const successCount = result.data.logs.filter((log: OperationLog) => log.status === "SUCCESS").length;
      const failedCount = result.data.logs.filter((log: OperationLog) => log.status === "FAILED").length;
      const today = new Date().toISOString().split('T')[0];
      const todayCount = result.data.logs.filter((log: OperationLog) => 
        log.createdAt.startsWith(today)
      ).length;

      setStats({
        total,
        success: successCount,
        failed: failedCount,
        todayCount,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取日志失败");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, searchQuery, selectedModule, selectedStatus]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // 获取状态样式
  const getStatusBadge = (status: string) => {
    if (status === "SUCCESS") {
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          成功
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800">
        <AlertCircle className="mr-1 h-3 w-3" />
        失败
      </Badge>
    );
  };

  // 获取模块图标
  const getModuleIcon = (module: string) => {
    switch (module) {
      case "auth":
        return <Shield className="h-3.5 w-3.5 text-slate-500" />;
      case "user":
        return <Users className="h-3.5 w-3.5 text-slate-500" />;
      case "project":
        return <FolderOpen className="h-3.5 w-3.5 text-slate-500" />;
      case "mock":
        return <Network className="h-3.5 w-3.5 text-slate-500" />;
      case "member":
        return <User className="h-3.5 w-3.5 text-slate-500" />;
      default:
        return <Database className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  // 导出日志
  const handleExport = async () => {
    try {
      const params = {
        module: selectedModule !== "all" ? selectedModule : undefined,
      };

      const response = await fetch("/api/operation-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) throw new Error("导出失败");

      const result = await response.json();
      
      // 生成CSV内容
      const csvContent = generateCSV(result.data.logs);
      
      // 下载文件
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `operation-logs-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("日志导出成功");
    } catch {
      toast.error("导出失败，请重试");
    }
  };

  // 生成CSV内容
  const generateCSV = (logs: OperationLog[]) => {
    const headers = ["时间", "操作用户", "模块", "操作类型", "操作描述", "目标", "状态", "IP地址", "错误信息"];
    const rows = logs.map(log => [
      format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss"),
      log.user.email,
      getModuleLabel(log.module),
      getOperationTypeLabel(log.type),
      log.action,
      log.targetName || "-",
      log.status === "SUCCESS" ? "成功" : "失败",
      log.ip || "-",
      log.errorMessage || "-",
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");
    
    return "\uFEFF" + csvContent; // 添加BOM以支持中文
  };

  const statsData = [
    {
      title: "总操作数",
      value: stats.total.toString(),
      icon: Activity,
      description: "所有操作记录",
      color: "text-slate-600",
      bgColor: "bg-slate-100 dark:bg-slate-900/50",
    },
    {
      title: "成功操作",
      value: stats.success.toString(),
      icon: CheckCircle,
      description: "执行成功的操作",
      color: "text-emerald-600 dark:text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      title: "失败操作",
      value: stats.failed.toString(),
      icon: AlertCircle,
      description: "执行失败的操作",
      color: "text-red-600 dark:text-red-500",
      bgColor: "bg-red-50 dark:bg-red-900/20",
    },
    {
      title: "今日操作",
      value: stats.todayCount.toString(),
      icon: Clock,
      description: "今天的操作次数",
      color: "text-blue-600 dark:text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center">
          <History className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            操作日志
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {userRole === "ADMIN" 
              ? "查看和管理所有用户的操作记录" 
              : "查看您的操作记录"}
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-slate-200 dark:border-slate-800 hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {stat.title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                  <Icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 操作日志列表 - 改进的设计 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        {/* 卡片头部 */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                操作记录
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {userRole === "ADMIN" 
                  ? "系统所有用户的操作历史" 
                  : "您的操作历史记录"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                className="h-9 px-3 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                导出CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchLogs}
                disabled={loading}
                className="h-9 px-3 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                <span className="ml-2">刷新</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 筛选和搜索区域 */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* 搜索框 */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="搜索操作描述、用户、目标..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
            
            {/* 模块筛选 */}
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="选择模块" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模块</SelectItem>
                <SelectItem value="auth">认证管理</SelectItem>
                <SelectItem value="user">用户管理</SelectItem>
                <SelectItem value="project">项目管理</SelectItem>
                <SelectItem value="member">成员管理</SelectItem>
                <SelectItem value="mock">Mock管理</SelectItem>
              </SelectContent>
            </Select>
            
            {/* 状态筛选 */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="SUCCESS">成功</SelectItem>
                <SelectItem value="FAILED">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 日志列表 - 使用与接口日志一致的网格布局 */}
        <div className="overflow-hidden">
          {/* 表头 */}
          <div className="grid grid-cols-12 items-center gap-3 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-600 dark:text-slate-400">
            <div className="col-span-2">时间</div>
            <div className="col-span-3">操作用户</div>
            <div className="col-span-1">模块</div>
            <div className="col-span-3">操作详情</div>
            <div className="col-span-1">目标</div>
            <div className="col-span-1">状态</div>
            <div className="col-span-1 text-center">操作</div>
          </div>
          {/* 数据行 */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-3">
                <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mx-auto" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  加载日志中...
                </p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-3">
                <Activity className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  暂无操作记录
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="grid grid-cols-12 items-center gap-3 px-4 py-2.5">
                    {/* 时间 - 2列 */}
                    <div className="col-span-2">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {format(new Date(log.createdAt), "HH:mm:ss", { locale: zhCN })}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(log.createdAt), "yyyy-MM-dd", { locale: zhCN })}
                        </p>
                      </div>
                    </div>

                    {/* 操作用户 - 3列 */}
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center text-white font-medium text-xs shrink-0",
                          log.user.role === "ADMIN" 
                            ? "bg-gradient-to-br from-purple-500 to-purple-600" 
                            : "bg-gradient-to-br from-blue-500 to-blue-600"
                        )}>
                          {log.user.name ? log.user.name[0].toUpperCase() : log.user.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {log.user.name || "未设置"}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {log.user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 模块 - 1列 */}
                    <div className="col-span-1">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                        {getModuleIcon(log.module)}
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {getModuleLabel(log.module)}
                        </span>
                      </div>
                    </div>

                    {/* 操作详情 - 3列 */}
                    <div className="col-span-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {getOperationTypeLabel(log.type)}
                        </p>
                        <p className="text-xs text-slate-500 truncate" title={log.action}>
                          {log.action}
                        </p>
                      </div>
                    </div>

                    {/* 目标 - 1列 */}
                    <div className="col-span-1">
                      {log.targetName ? (
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate block" title={log.targetName}>
                          {log.targetName}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </div>

                    {/* 状态 - 1列 */}
                    <div className="col-span-1">
                      {getStatusBadge(log.status)}
                    </div>

                    {/* 操作 - 1列 */}
                    <div className="col-span-1 flex items-center justify-center">
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 分页 - 优化的设计 */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  显示 <span className="font-medium text-slate-900 dark:text-white">{(pagination.page - 1) * pagination.pageSize + 1}</span> - 
                  <span className="font-medium text-slate-900 dark:text-white"> {Math.min(pagination.page * pagination.pageSize, pagination.total)}</span>，
                  共 <span className="font-medium text-slate-900 dark:text-white">{pagination.total}</span> 条记录
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  disabled={pagination.page === 1}
                  className="h-8 px-3 border-slate-200 dark:border-slate-700"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  上一页
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={i}
                        variant={pageNum === pagination.page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPagination((prev) => ({ ...prev, page: pageNum }))}
                        className={cn(
                          "h-8 w-8 p-0",
                          pageNum === pagination.page 
                            ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200" 
                            : "border-slate-200 dark:border-slate-700"
                        )}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(pagination.totalPages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                  className="h-8 px-3 border-slate-200 dark:border-slate-700"
                >
                  下一页
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 日志详情对话框 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>操作详情</DialogTitle>
            <DialogDescription>
              查看操作的详细信息
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    操作时间
                  </label>
                  <p className="text-sm">
                    {format(new Date(selectedLog.createdAt), "yyyy-MM-dd HH:mm:ss")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    操作用户
                  </label>
                  <p className="text-sm">{selectedLog.user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    操作模块
                  </label>
                  <p className="text-sm">{getModuleLabel(selectedLog.module)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    操作类型
                  </label>
                  <p className="text-sm">{getOperationTypeLabel(selectedLog.type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    操作状态
                  </label>
                  <div>{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    IP地址
                  </label>
                  <p className="text-sm">{selectedLog.ip || "-"}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  操作描述
                </label>
                <p className="text-sm mt-1">{selectedLog.action}</p>
              </div>

              {selectedLog.targetName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    操作目标
                  </label>
                  <p className="text-sm mt-1">{selectedLog.targetName}</p>
                </div>
              )}

              {selectedLog.errorMessage && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    错误信息
                  </label>
                  <p className="text-sm mt-1 text-red-600 dark:text-red-400">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    元数据
                  </label>
                  <pre className="mt-1 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    用户代理
                  </label>
                  <p className="text-xs mt-1 text-muted-foreground break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}