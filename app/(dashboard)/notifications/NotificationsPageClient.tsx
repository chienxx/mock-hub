"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Check,
  Trash2,
  Search,
  RefreshCw,
  Bell,
  CheckCheck,
  Clock,
  Info,
  AlertCircle,
  Folder,
  Server,
  Shield,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { ApiResponse } from "@/types/project";
import type { NotificationType } from "@prisma/client";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: unknown;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  totalPages: number;
}

export function NotificationsPageClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // 通知设置
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: false,
    projectUpdates: true,
    mockErrors: true,
    systemAlerts: true,
    weeklyReport: false,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    unreadCount: 0,
  });

  // 获取通知列表
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...(selectedType !== "all" && { type: selectedType }),
        ...(readFilter !== "all" && {
          isRead: readFilter === "read" ? "true" : "false",
        }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/notifications?${params}`);
      const result: ApiResponse<NotificationsResponse> = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "获取通知失败");
      }

      if (result.data) {
        setNotifications(result.data.notifications);
        setPagination((prev) => ({
          ...prev,
          total: result.data?.total || 0,
          totalPages: result.data?.totalPages || 1,
          unreadCount: result.data?.unreadCount || 0,
        }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取通知失败");
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.pageSize,
    selectedType,
    readFilter,
    searchQuery,
  ]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 标记为已读
  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: notificationIds }),
      });

      if (!response.ok) throw new Error("操作失败");

      setNotifications((prev) =>
        prev.map((n) =>
          notificationIds.includes(n.id) ? { ...n, isRead: true } : n,
        ),
      );

      setPagination((prev) => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - notificationIds.length),
      }));

      toast.success("已标记为已读");
    } catch {
      toast.error("操作失败，请重试");
    }
  };

  // 删除通知
  const deleteNotifications = async (notificationIds: string[]) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: notificationIds }),
      });

      if (!response.ok) throw new Error("删除失败");

      setNotifications((prev) =>
        prev.filter((n) => !notificationIds.includes(n.id)),
      );
      toast.success("已删除通知");
    } catch {
      toast.error("删除失败，请重试");
    }
  };

  // 标记全部已读
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  };

  // 获取通知图标
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "PROJECT":
        return <Folder className="h-4 w-4" />;
      case "MOCK":
        return <Server className="h-4 w-4" />;
      case "API_ERROR":
        return <AlertCircle className="h-4 w-4" />;
      case "SYSTEM":
        return <Shield className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // 获取通知类型样式 - 使用符合整体设计的配色
  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case "PROJECT":
        return "bg-slate-600 dark:bg-slate-500";
      case "MOCK":
        return "bg-slate-700 dark:bg-slate-400";
      case "API_ERROR":
        return "bg-red-600 dark:bg-red-500";
      case "SYSTEM":
        return "bg-slate-800 dark:bg-slate-300";
      default:
        return "bg-slate-500 dark:bg-slate-600";
    }
  };

  // 获取通知类型标签
  const getNotificationLabel = (type: NotificationType) => {
    switch (type) {
      case "PROJECT":
        return "项目";
      case "MOCK":
        return "Mock";
      case "API_ERROR":
        return "错误";
      case "SYSTEM":
        return "系统";
      default:
        return "通知";
    }
  };

  const filteredNotifications = notifications.filter(
    (n) =>
      !searchQuery ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 - 统一风格 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              通知中心
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {pagination.unreadCount > 0
                ? `您有 ${pagination.unreadCount} 条未读通知`
                : "暂无未读通知"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pagination.unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={markAllAsRead}
              className="border-slate-200 dark:border-slate-700"
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              全部已读
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowSettings(true)}
            className="border-slate-200 dark:border-slate-700"
          >
            <Settings className="mr-2 h-4 w-4" />
            设置
          </Button>
          <Button
            variant="outline"
            onClick={fetchNotifications}
            disabled={loading}
            className="border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

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
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索通知内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="通知类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="PROJECT">项目通知</SelectItem>
              <SelectItem value="MOCK">Mock通知</SelectItem>
              <SelectItem value="API_ERROR">错误通知</SelectItem>
              <SelectItem value="SYSTEM">系统通知</SelectItem>
            </SelectContent>
          </Select>

          <Select value={readFilter} onValueChange={setReadFilter}>
            <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="阅读状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="unread">未读</SelectItem>
              <SelectItem value="read">已读</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 通知列表 */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-white mx-auto" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                加载通知中...
              </p>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="border-slate-200/60 dark:border-slate-800/60">
            <div className="flex flex-col items-center justify-center py-20">
              <Bell className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
              <p className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                暂无通知
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {searchQuery ? "没有找到匹配的通知" : "您的通知中心是空的"}
              </p>
            </div>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={cn(
                "border-slate-200/60 dark:border-slate-800/60 transition-all cursor-pointer",
                "hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700",
                "hover:translate-y-[-1px]",
                !notification.isRead &&
                  "bg-slate-50/80 dark:bg-slate-800/30 border-slate-300/80 dark:border-slate-700/80 shadow-sm",
              )}
              onClick={() => {
                setSelectedNotification(notification);
                if (!notification.isRead) {
                  markAsRead([notification.id]);
                }
              }}
            >
              <div className="p-3">
                <div className="flex items-start gap-2.5">
                  <div className="relative flex-shrink-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                        getNotificationStyle(notification.type),
                      )}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    {!notification.isRead && (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3
                            className={cn(
                              "text-sm font-medium",
                              notification.isRead
                                ? "text-slate-600 dark:text-slate-400"
                                : "text-slate-800 dark:text-slate-200",
                            )}
                          >
                            {notification.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4",
                              notification.isRead
                                ? "text-slate-400 border-slate-200 dark:text-slate-500 dark:border-slate-700"
                                : "text-slate-500 border-slate-300 dark:text-slate-400 dark:border-slate-600",
                            )}
                          >
                            {getNotificationLabel(notification.type)}
                          </Badge>
                        </div>
                        <p
                          className={cn(
                            "text-xs leading-relaxed line-clamp-2",
                            notification.isRead
                              ? "text-slate-500 dark:text-slate-500"
                              : "text-slate-600 dark:text-slate-400",
                          )}
                        >
                          {notification.content}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock className="h-3 w-3 text-slate-400 dark:text-slate-600" />
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              {
                                addSuffix: true,
                                locale: zhCN,
                              },
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead([notification.id]);
                            }}
                            className="h-8 px-2"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("确定要删除这条通知吗？")) {
                              deleteNotifications([notification.id]);
                            }
                          }}
                          className="h-8 px-2 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}

        {/* 分页 */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              共 {pagination.total} 条通知
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
                className="border-slate-200 dark:border-slate-700"
              >
                上一页
              </Button>
              <span className="px-3 text-sm text-slate-600 dark:text-slate-400">
                {pagination.page} / {pagination.totalPages}
              </span>
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
                className="border-slate-200 dark:border-slate-700"
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 通知设置对话框 */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              通知设置
            </DialogTitle>
            <DialogDescription>配置您的通知偏好和接收方式</DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-6">
            {/* 接收方式 */}
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4">
                接收方式
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      推送通知
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      在浏览器中接收实时推送
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        pushNotifications: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 通知类型 */}
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4">
                通知类型
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      项目更新
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      项目成员变动、设置修改等
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.projectUpdates}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        projectUpdates: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Mock 错误
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      API 调用失败、超时等错误
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.mockErrors}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        mockErrors: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      系统通知
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      系统维护、更新公告等
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.systemAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        systemAlerts: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      周报
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      每周接收使用统计和分析报告
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.weeklyReport}
                    onCheckedChange={(checked) =>
                      setNotificationSettings((prev) => ({
                        ...prev,
                        weeklyReport: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 静默时段 */}
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4">
                静默时段
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">开始时间</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    defaultValue="22:00"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end">结束时间</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    defaultValue="08:00"
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                在静默时段内，您将不会收到任何通知
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowSettings(false)}
              className="border-slate-200 dark:border-slate-700"
            >
              取消
            </Button>
            <Button
              onClick={() => {
                // 保存设置逻辑
                toast.success("通知设置已保存");
                setShowSettings(false);
              }}
            >
              保存设置
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 通知详情对话框 */}
      <Dialog
        open={!!selectedNotification}
        onOpenChange={() => setSelectedNotification(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification &&
                getNotificationIcon(selectedNotification.type)}
              {selectedNotification?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedNotification &&
                formatDistanceToNow(new Date(selectedNotification.createdAt), {
                  addSuffix: true,
                  locale: zhCN,
                })}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {selectedNotification?.content}
            </p>
            {selectedNotification?.metadata ? (
              <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <pre className="text-xs text-slate-600 dark:text-slate-400">
                  {JSON.stringify(
                    selectedNotification.metadata as Record<string, unknown>,
                    null,
                    2,
                  )}
                </pre>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
