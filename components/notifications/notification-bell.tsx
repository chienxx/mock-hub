"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotificationStore } from "@/lib/stores/notification-store";
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
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { refreshKey } = useNotificationStore();

  // 获取通知列表
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications?pageSize=10");
      const result: ApiResponse<NotificationsResponse> = await response.json();

      if (response.ok && result.data) {
        setNotifications(result.data.notifications);
        setUnreadCount(result.data.unreadCount);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  };

  // 标记为已读
  const markAsRead = async (notificationIds?: string[]) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationIds,
          markAll: !notificationIds,
        }),
      });

      if (response.ok) {
        fetchNotifications();
      }
    } catch {
      toast.error("标记失败");
    }
  };

  // 删除通知
  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });

      if (response.ok) {
        toast.success("通知已删除");
        fetchNotifications();
      }
    } catch {
      toast.error("删除失败");
    }
  };

  // 监听刷新信号
  useEffect(() => {
    fetchNotifications();
  }, [refreshKey]);

  // 初始化
  useEffect(() => {
    fetchNotifications();

    // SSE连接 - 实时接收通知
    const source = new EventSource("/api/notifications/stream");

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "notification") {
          // 收到新通知，立即刷新通知列表
          fetchNotifications();
          
          // 显示桌面通知（如果用户允许）
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(data.data.title, {
              body: data.data.content,
              icon: "/favicon.ico",
            });
          }
        }
      } catch {
        // 忽略解析错误
      }
    };

    source.onerror = () => {
      // SSE连接错误，关闭连接
      source.close();
    };

    // 请求通知权限
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      source.close();
    };
  }, []);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "PROJECT":
        return "📁";
      case "MOCK":
        return "🔗";
      case "API_ERROR":
        return "⚠️";
      case "SYSTEM":
        return "📢";
      default:
        return "📬";
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case "API_ERROR":
        return "text-red-600 dark:text-red-400";
      case "SYSTEM":
        return "text-slate-700 dark:text-slate-300";
      case "PROJECT":
        return "text-slate-600 dark:text-slate-400";
      case "MOCK":
        return "text-slate-700 dark:text-slate-300";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">通知中心</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => markAsRead()}>
                <Check className="h-4 w-4 mr-1" />
                全部已读
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              加载中...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              暂无通知
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-accent transition-colors ${
                    !notification.isRead ? "bg-accent/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-1">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 space-y-1">
                      <p
                        className={`font-medium ${getNotificationColor(notification.type)}`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => markAsRead([notification.id])}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="p-3">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setOpen(false);
              window.location.href = "/notifications";
            }}
          >
            查看全部通知
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
