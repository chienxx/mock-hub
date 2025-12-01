"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Activity,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CallbackStat {
  callbackId: string;
  callbackName: string | null;
  callbackUrl: string;
  enabled: boolean;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgResponseTime: number;
}

interface StatsSummary {
  totalCallbacks: number;
  enabledCallbacks: number;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgResponseTime: number;
}

interface Props {
  mockApiId: string;
  projectId: string;
}

export function CallbackStats({ mockApiId, projectId }: Props) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [callbackStats, setCallbackStats] = useState<CallbackStat[]>([]);

  useEffect(() => {
    loadStats();
  }, [mockApiId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/mocks/${mockApiId}/callbacks/stats`
      );

      if (!response.ok) {
        throw new Error("获取统计信息失败");
      }

      const result = await response.json();
      setSummary(result.data.summary);
      setCallbackStats(result.data.callbackStats || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取统计信息失败");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return "text-emerald-600 dark:text-emerald-400";
    if (rate >= 80) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-6">
      {/* 刷新按钮 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          统计概览
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={loadStats}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          刷新
        </Button>
      </div>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 总回调数 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总回调数</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCallbacks}</div>
            <p className="text-xs text-slate-500 mt-1">
              已启用 {summary.enabledCallbacks} 个
            </p>
          </CardContent>
        </Card>

        {/* 执行次数 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总执行次数</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalExecutions}</div>
            <p className="text-xs text-slate-500 mt-1">
              成功 {summary.successCount} / 失败 {summary.failureCount}
            </p>
          </CardContent>
        </Card>

        {/* 成功率 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
            <CheckCircle className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getSuccessRateColor(summary.successRate)}`}
            >
              {summary.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {summary.totalExecutions > 0 ? "基于历史执行记录" : "暂无数据"}
            </p>
          </CardContent>
        </Card>

        {/* 平均响应时间 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
            <Clock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.avgResponseTime}ms
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {summary.avgResponseTime < 1000 ? "响应快速" : "响应较慢"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 各回调详细统计 */}
      {callbackStats.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            各回调详细统计
          </h3>
          <div className="space-y-2">
            {callbackStats.map((stat) => (
              <Card key={stat.callbackId}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900 dark:text-white truncate">
                          {stat.callbackName || "未命名回调"}
                        </span>
                        {!stat.enabled && (
                          <Badge variant="outline" className="text-slate-500">
                            已禁用
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mb-2">
                        {stat.callbackUrl}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-slate-600 dark:text-slate-400">
                          执行: {stat.totalExecutions}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="h-3 w-3" />
                          {stat.successCount}
                        </span>
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircle className="h-3 w-3" />
                          {stat.failureCount}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <Clock className="h-3 w-3" />
                          {stat.avgResponseTime}ms
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div
                        className={`text-lg font-bold ${getSuccessRateColor(stat.successRate)}`}
                      >
                        {stat.successRate.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {callbackStats.length === 0 && summary.totalCallbacks > 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Activity className="h-12 w-12 text-slate-400 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              暂无执行记录
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
