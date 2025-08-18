"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UnifiedCard,
  StatCard,
  ListItem,
} from "@/components/dashboard/unified-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  FolderOpen,
  FileCode,
  AlertCircle,
  TrendingUp,
  Zap,
  Plus,
  BarChart3,
  Server,
  CheckCircle,
  Globe,
  RefreshCw,
  ChevronRight,
  Bug,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface DashboardStats {
  projectCount: number;
  mockApiCount: number;
  todayLogsCount: number;
  errorRate: string;
}

interface RecentProject {
  id: string;
  shortId: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  _count: {
    mockAPIs: number;
  };
}

interface RecentMockApi {
  id: string;
  name: string | null;
  method: string;
  path: string;
  enabled: boolean;
  createdAt: Date;
  project: {
    id: string;
    shortId: string;
    name: string;
  };
}

interface RecentLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  createdAt: Date;
  mockApi: {
    name: string | null;
    project: {
      shortId: string;
      name: string;
    };
  };
}

interface HotApi {
  id: string;
  name: string | null;
  method: string;
  path: string;
  count: number;
  project: {
    id: string;
    shortId: string;
    name: string;
  };
}

interface ProblemApi {
  id: string;
  name: string | null;
  method: string;
  path: string;
  errorCount: number;
  project: {
    id: string;
    shortId: string;
    name: string;
  };
}

interface DashboardClientProps {
  userId: string;
  userRole: string;
  stats: DashboardStats;
  recentProjects: RecentProject[];
  recentMockApis: RecentMockApi[];
  recentLogs: RecentLog[];
  hotApis?: HotApi[];
  problemApis?: ProblemApi[];
}

export function DashboardClient({
  stats,
  recentProjects,
  recentMockApis,
  recentLogs,
  hotApis = [],
  problemApis = [],
}: DashboardClientProps) {
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 自动刷新功能 - 使用 fetch 而不是 reload，更友好
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // 这里应该调用 API 重新获取数据，而不是刷新整个页面
      // 目前暂时使用 reload，后续可以优化为 fetch API
      window.location.reload();
    }, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: "bg-emerald-50 text-emerald-700 border-emerald-200",
      POST: "bg-blue-50 text-blue-700 border-blue-200",
      PUT: "bg-orange-50 text-orange-700 border-orange-200",
      DELETE: "bg-red-50 text-red-700 border-red-200",
      PATCH: "bg-purple-50 text-purple-700 border-purple-200",
    };
    return colors[method] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-emerald-600";
    if (status >= 400 && status < 500) return "text-amber-600";
    if (status >= 500) return "text-red-600";
    return "text-slate-600";
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和控制区 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              仪表盘
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              实时监控服务状态与数据分析
            </p>
          </div>
        </div>

        {/* 优雅的自动刷新按钮 */}
        <div className="relative">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`
              relative flex items-center gap-2 px-3 py-2 rounded-lg
              transition-all duration-500 ease-out
              ${
                autoRefresh
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }
            `}
            title={autoRefresh ? "点击停止自动刷新" : "点击开启自动刷新"}
          >
            {/* 图标容器 */}
            <div className="relative">
              <RefreshCw
                className={`
                w-4 h-4 transition-all duration-700
                ${autoRefresh ? "animate-[spin_3s_linear_infinite]" : ""}
              `}
              />

              {/* 环形进度背景 - 只在激活时显示 */}
              {autoRefresh && (
                <svg className="absolute inset-0 w-4 h-4 -rotate-90">
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="none"
                    opacity="0.2"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="none"
                    strokeDasharray="44"
                    strokeDashoffset="0"
                    className="animate-[progress_30s_linear_infinite]"
                    style={{
                      animation: "dash 30s linear infinite",
                      strokeDashoffset: "44",
                    }}
                  />
                </svg>
              )}
            </div>

            {/* 文字 */}
            <span className="text-sm font-medium">
              {autoRefresh ? "自动刷新" : "自动刷新"}
            </span>

            {/* 状态指示 - 集成在按钮内 */}
            {autoRefresh && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span className="text-xs opacity-80">30s</span>
              </div>
            )}
          </button>

          {/* 极简的状态提示 - 使用 tooltip 样式，不遮挡内容 */}
          {autoRefresh && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded whitespace-nowrap pointer-events-none opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]">
              已开启
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45" />
            </div>
          )}
        </div>
      </div>

      {/* 核心数据指标 - 使用统一设计 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="项目总数"
          value={stats.projectCount}
          icon={FolderOpen}
          status="活跃状态"
          trend={<CheckCircle className="w-3 h-3 text-emerald-500" />}
        />

        <StatCard
          label="Mock API"
          value={stats.mockApiCount}
          icon={Server}
          status="已创建接口"
          trend={<Globe className="w-3 h-3 text-blue-500" />}
        />

        <StatCard
          label="今日调用"
          value={stats.todayLogsCount.toLocaleString()}
          icon={Activity}
          status={stats.todayLogsCount > 0 ? "活跃中" : "暂无调用"}
          trend={
            <div className="flex items-center gap-1">
              {[12, 18, 15, 20, 16, 22, 14].map((height, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full"
                  style={{
                    height: `${height}px`,
                    backgroundColor:
                      stats.todayLogsCount > 0 ? "#64748b" : "#e2e8f0",
                  }}
                />
              ))}
            </div>
          }
        />

        <StatCard
          label="错误率"
          value={`${stats.errorRate}%`}
          icon={parseFloat(stats.errorRate) < 5 ? CheckCircle : AlertCircle}
          status={parseFloat(stats.errorRate) < 5 ? "运行稳定" : "需要关注"}
          trend={
            <div className="w-full">
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    parseFloat(stats.errorRate) < 5
                      ? "bg-emerald-500"
                      : parseFloat(stats.errorRate) < 10
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(parseFloat(stats.errorRate) * 2, 100)}%`,
                  }}
                />
              </div>
            </div>
          }
        />
      </div>

      {/* 主要内容区域 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 热门 API */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <CardTitle className="text-lg font-semibold">
                  热门 API
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/analytics">查看详情</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {hotApis.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无热点数据</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hotApis.slice(0, 5).map((api, index) => (
                  <Link
                    key={api.id}
                    href={`/projects/${api.project.id}/mocks/${api.id}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex-shrink-0 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getMethodColor(api.method)} px-2 py-0.5`}
                          >
                            {api.method}
                          </Badge>
                          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {api.name || "未命名接口"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {api.project.name} • {api.path}
                        </p>
                        {/* 简单的使用量条形图 */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                            <div
                              className="bg-slate-900 dark:bg-slate-400 h-1 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min((api.count / Math.max(...hotApis.map((a) => a.count))) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {api.count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 项目动态 */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <CardTitle className="text-lg font-semibold">
                  最新项目
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/projects">查看全部</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  暂无项目
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/projects">
                    <Plus className="w-4 h-4 mr-2" />
                    创建项目
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.slice(0, 4).map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block group"
                  >
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                        <FolderOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {project.name}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {project._count.mockAPIs}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1">
                          {project.description || "暂无描述"}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {formatDistanceToNow(new Date(project.updatedAt), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 快速操作 */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <CardTitle className="text-lg font-semibold">快速操作</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Link href="/projects">
                  <Plus className="w-4 h-4 mr-2" />
                  新建项目
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Link href="/mocks">
                  <FileCode className="w-4 h-4 mr-2" />
                  管理 API 接口
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Link href="/logs">
                  <Activity className="w-4 h-4 mr-2" />
                  查看调用日志
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Link href="/analytics">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  数据分析报告
                </Link>
              </Button>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-3 text-slate-600 dark:text-slate-400">
                统计概览
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    活跃项目
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {stats.projectCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    API 接口
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {stats.mockApiCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    今日调用
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {stats.todayLogsCount}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 活动和监控 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 最新接口 - 使用统一设计 */}
        <UnifiedCard
          title="最新接口"
          icon={Server}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/mocks">查看全部</Link>
            </Button>
          }
        >
          {recentMockApis.length === 0 ? (
            <div className="text-center py-8">
              <Server className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                暂无接口
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/mocks">
                  <Plus className="w-4 h-4 mr-2" />
                  创建接口
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {recentMockApis.slice(0, 5).map((api) => (
                <Link
                  key={api.id}
                  href={`/projects/${api.project.id}/mocks/${api.id}`}
                  className="block"
                >
                  <ListItem
                    leading={
                      <Badge
                        variant="outline"
                        className={`${getMethodColor(api.method)} text-xs`}
                      >
                        {api.method}
                      </Badge>
                    }
                    title={api.name || "未命名接口"}
                    subtitle={`${api.project.name} • ${api.path}`}
                    trailing={
                      <div className="flex items-center gap-2">
                        {api.enabled ? (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        ) : (
                          <div className="w-2 h-2 bg-slate-400 rounded-full" />
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    }
                  />
                </Link>
              ))}
            </div>
          )}
        </UnifiedCard>

        {/* 异常检测 */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <Bug className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <CardTitle className="text-lg font-semibold">
                  异常检测
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/logs">查看日志</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 && problemApis.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                  接口运行正常
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  最近没有检测到异常请求
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 问题API */}
                {problemApis.slice(0, 2).map((api) => (
                  <Link
                    key={api.id}
                    href={`/projects/${api.project.id}/mocks/${api.id}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
                      <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getMethodColor(api.method)}`}
                          >
                            {api.method}
                          </Badge>
                          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {api.name || "未命名接口"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {api.project.name} • {api.errorCount} 次错误
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}

                {/* 最新错误日志 */}
                {recentLogs.slice(0, 3).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                  >
                    <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(log.statusCode)} bg-slate-100 dark:bg-slate-800`}
                        >
                          {log.statusCode}
                        </span>
                        <span className="text-sm font-medium">
                          {log.method}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {log.path}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
