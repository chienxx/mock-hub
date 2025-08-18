"use client";

import { useState, useEffect } from "react";
import {
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Zap,
  BarChart3,
  Server,
} from "lucide-react";
import { ProjectHeader } from "@/components/projects/project-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AnalyticsPageClientProps {
  projectId: string;
  projectName: string;
  projectShortId?: string;
}

interface AnalyticsData {
  overview: {
    totalCalls: number;
    totalMocks: number;
    successRate: number;
    avgResponseTime: number;
    dailyActive: number;
    trend: "up" | "down" | "stable";
    trendPercent: number;
  };
  apiTrend: Array<{
    date: string;
    calls: number;
    errors: number;
    avgTime: number;
  }>;
  statusDistribution: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  responseTimeDistribution: Array<{
    range: string;
    count: number;
  }>;
  topApis: Array<{
    id: string;
    name: string;
    path: string;
    method: string;
    calls: number;
    successRate: number;
    avgTime: number;
  }>;
  methodDistribution: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
}

export function AnalyticsPageClient({
  projectId,
  projectName,
  projectShortId,
}: AnalyticsPageClientProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState("7d");

  // 获取分析数据
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/analytics?range=${dateRange}`,
      );

      if (!response.ok) {
        throw new Error("获取分析数据失败");
      }

      const result = await response.json();
      setData(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取分析数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, dateRange]);

  // 自定义 Tooltip
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      color: string;
      name: string;
      value: number;
      dataKey?: string;
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
            {label}
          </p>
          {payload.map((entry, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {entry.dataKey === "avgTime" ? `${entry.value}ms` : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-white mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            加载分析数据中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 项目头部导航 */}
      <ProjectHeader
        projectName={projectName}
        projectShortId={projectShortId}
        projectId={projectId}
        title="数据分析"
        subtitle="监控和分析接口性能趋势"
        icon={<BarChart3 className="h-5 w-5 text-white" />}
        backToFunctionPage="/analytics"
      >
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">最近 24 小时</SelectItem>
            <SelectItem value="7d">最近 7 天</SelectItem>
            <SelectItem value="30d">最近 30 天</SelectItem>
            <SelectItem value="90d">最近 90 天</SelectItem>
          </SelectContent>
        </Select>
      </ProjectHeader>

      {/* 概览卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总调用次数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.totalCalls.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {data.overview.trend === "up" ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : data.overview.trend === "down" ? (
                <TrendingDown className="h-3 w-3 text-red-500" />
              ) : null}
              <p
                className={cn(
                  "text-xs",
                  data.overview.trend === "up"
                    ? "text-emerald-600"
                    : data.overview.trend === "down"
                      ? "text-red-600"
                      : "text-muted-foreground",
                )}
              >
                {data.overview.trend === "up" ? "+" : ""}
                {data.overview.trendPercent}% 较上期
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.successRate.toFixed(1)}%
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all",
                  data.overview.successRate >= 95
                    ? "bg-emerald-500"
                    : data.overview.successRate >= 80
                      ? "bg-amber-500"
                      : "bg-red-500",
                )}
                style={{ width: `${data.overview.successRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.avgResponseTime}ms
            </div>
            <Badge
              variant="outline"
              className={cn(
                "mt-1",
                data.overview.avgResponseTime < 100
                  ? "border-emerald-500 text-emerald-600"
                  : data.overview.avgResponseTime < 500
                    ? "border-amber-500 text-amber-600"
                    : "border-red-500 text-red-600",
              )}
            >
              {data.overview.avgResponseTime < 100
                ? "优秀"
                : data.overview.avgResponseTime < 500
                  ? "良好"
                  : "需优化"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃 Mock API</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalMocks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              今日活跃 {data.overview.dailyActive} 个
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 图表 */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">接口调用趋势</TabsTrigger>
          <TabsTrigger value="distribution">请求状态分布</TabsTrigger>
          <TabsTrigger value="performance">响应性能分析</TabsTrigger>
          <TabsTrigger value="ranking">热门接口排行</TabsTrigger>
        </TabsList>

        {/* 调用趋势 */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API 调用趋势</CardTitle>
              <CardDescription>展示接口调用量和错误率变化</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={data.apiTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    style={{ fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#94a3b8"
                    style={{ fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#94a3b8"
                    style={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="calls"
                    name="调用次数"
                    stroke="#0ea5e9"
                    fill="#0ea5e9"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgTime"
                    name="平均响应时间"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: "#8b5cf6", r: 3 }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="errors"
                    name="错误次数"
                    fill="#ef4444"
                    opacity={0.7}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 状态分布 */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>状态码分布</CardTitle>
                <CardDescription>各类状态码占比</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.statusDistribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0
                              ? "#10b981"
                              : index === 1
                                ? "#f59e0b"
                                : index === 2
                                  ? "#ef4444"
                                  : "#64748b"
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {data.statusDistribution.map((item, index) => {
                    const colors = ["#10b981", "#f59e0b", "#ef4444", "#64748b"];
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: colors[index] }}
                          />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">
                          {item.value} ({item.percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>请求方法分布</CardTitle>
                <CardDescription>不同 HTTP 方法使用情况</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.methodDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="method"
                      stroke="#94a3b8"
                      style={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="count"
                      name="调用次数"
                      fill="#6366f1"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {data.methodDistribution.slice(0, 4).map((item, index) => {
                    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
                    const icons = ["→", "↑", "↻", "×"];
                    return (
                      <div
                        key={item.method}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs"
                            style={{ backgroundColor: colors[index] }}
                          >
                            {icons[index]}
                          </span>
                          <span className="text-sm font-medium">
                            {item.method}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.count}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.percentage}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 性能分析 */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>响应时间分布</CardTitle>
              <CardDescription>接口响应速度统计分析</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.responseTimeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="range"
                    stroke="#94a3b8"
                    style={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="接口数量" radius={[8, 8, 0, 0]}>
                    {data.responseTimeDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.range === "0-100ms"
                            ? "#10b981"
                            : entry.range === "100-500ms"
                              ? "#3b82f6"
                              : entry.range === "500-1000ms"
                                ? "#f59e0b"
                                : entry.range === "1000ms+"
                                  ? "#ef4444"
                                  : "#94a3b8"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* 性能指标统计 */}
              <div className="mt-6 grid grid-cols-4 gap-2">
                {[
                  {
                    range: "0-100ms",
                    display: "<100ms",
                    color: "bg-emerald-500",
                    label: "极速",
                    icon: "⚡",
                  },
                  {
                    range: "100-500ms",
                    display: "100-500ms",
                    color: "bg-blue-500",
                    label: "标准",
                    icon: "✓",
                  },
                  {
                    range: "500-1000ms",
                    display: "500-1000ms",
                    color: "bg-amber-500",
                    label: "缓慢",
                    icon: "⚠",
                  },
                  {
                    range: "1000ms+",
                    display: ">1000ms",
                    color: "bg-red-500",
                    label: "超时",
                    icon: "✕",
                  },
                ].map((item) => {
                  const rangeData = data.responseTimeDistribution.find(
                    (d) => d.range === item.range,
                  );
                  const count = rangeData?.count || 0;
                  const total = data.responseTimeDistribution.reduce(
                    (sum, d) => sum + d.count,
                    0,
                  );
                  const percentage =
                    total > 0 ? Math.round((count / total) * 100) : 0;

                  return (
                    <div key={item.range} className="relative">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={cn("w-2 h-2 rounded-full", item.color)}
                            />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {item.label}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-500 pl-3.5">
                            {item.display}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {percentage}%
                        </span>
                      </div>
                      <div className="mt-1 text-center">
                        <span className="text-xs text-slate-500">
                          {count} 次
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 优化提示 */}
              {data.overview.avgResponseTime > 100 && (
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-2">
                    <Activity className="w-4 h-4 text-slate-600 dark:text-slate-400 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        平均响应: {data.overview.avgResponseTime}ms
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {data.overview.avgResponseTime < 500
                          ? "建议：优化数据库索引，启用查询缓存"
                          : "建议：检查慢查询，考虑使用 Redis 缓存热点数据"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API 排行 */}
        <TabsContent value="ranking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>热门 API 排行</CardTitle>
              <CardDescription>调用次数最多的接口</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topApis.map((api, index) => (
                  <div
                    key={api.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                          index === 0
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                            : index === 1
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400"
                              : index === 2
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400",
                        )}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              api.method === "GET"
                                ? "border-blue-500 text-blue-600"
                                : api.method === "POST"
                                  ? "border-green-500 text-green-600"
                                  : api.method === "PUT"
                                    ? "border-amber-500 text-amber-600"
                                    : "border-red-500 text-red-600",
                            )}
                          >
                            {api.method}
                          </Badge>
                          <code className="text-sm font-mono text-slate-900 dark:text-slate-100">
                            {api.path}
                          </code>
                        </div>
                        {api.name && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {api.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {api.calls.toLocaleString()} 次
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          调用次数
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            api.successRate >= 95
                              ? "text-emerald-600"
                              : api.successRate >= 80
                                ? "text-amber-600"
                                : "text-red-600",
                          )}
                        >
                          {api.successRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          成功率
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            api.avgTime < 100
                              ? "text-emerald-600"
                              : api.avgTime < 500
                                ? "text-amber-600"
                                : "text-red-600",
                          )}
                        >
                          {api.avgTime}ms
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          平均耗时
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
