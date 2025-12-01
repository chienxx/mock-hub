"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  FolderOpen,
  FileCode,
  BarChart3,
  Users,
  AlertCircle,
  HelpCircle,
  Bell,
  X,
  Zap,
  Shield,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "next-auth/react";
import { useMemo } from "react";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

// 根据用户角色获取项目管理的显示名称
const getProjectMenuLabel = (userRole?: string) => {
  switch (userRole) {
    case "ADMIN":
      return "所有项目"; // 管理员可以看到所有项目
    case "USER":
      return "我的项目"; // 普通用户只能看到自己的项目
    default:
      return "项目管理"; // 默认名称
  }
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // 根据用户角色动态生成菜单
  const menuItems = useMemo(() => {
    const userRole = session?.user?.role;
    const projectLabel = getProjectMenuLabel(userRole);

    const items = [
      {
        title: "工作台",
        items: [
          { label: "仪表盘", href: "/dashboard", icon: Home, badge: null },
          {
            label: projectLabel,
            href: "/projects",
            icon: FolderOpen,
            badge: null,
          },
        ],
      },
      {
        title: "Mock 服务",
        items: [
          { label: "API 接口", href: "/mocks", icon: FileCode, badge: "Hot" },
          { label: "接口日志", href: "/logs", icon: AlertCircle, badge: null },
          {
            label: "回调日志",
            href: "/callback-logs",
            icon: Webhook,
            badge: null,
          },
          {
            label: "数据分析",
            href: "/analytics",
            icon: BarChart3,
            badge: null,
          },
          {
            label: "通知中心",
            href: "/notifications",
            icon: Bell,
            badge: null,
          },
        ],
      },
    ];

    // 系统管理菜单（管理员特有）
    if (userRole === "ADMIN") {
      items.push({
        title: "系统管理",
        items: [
          { label: "用户管理", href: "/users", icon: Users, badge: null },
        ],
      });
    }

    // 支持菜单（所有用户可见）
    items.push({
      title: "支持",
      items: [
        { label: "操作日志", href: "/operations", icon: Shield, badge: null },
        { label: "帮助中心", href: "/help", icon: HelpCircle, badge: "New" },
      ],
    });

    return items;
  }, [session?.user?.role]);

  return (
    <>
      {/* 移动端遮罩 */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-72 glass-card border-r border-slate-200/60 dark:border-slate-700/60 transition-all duration-300 md:sticky md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* 移动端关闭按钮 */}
          <div className="flex items-center justify-between p-4 md:hidden border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-slate-900 rounded-xl flex items-center justify-center shadow-soft">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                控制面板
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 菜单列表 */}
          <ScrollArea className="flex-1 px-4 py-6">
            <div className="space-y-6">
              {menuItems.map((section, index) => (
                <div key={section.title}>
                  <div className="mb-3 px-2">
                    <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      {section.title === "工作台" && (
                        <Home className="h-3 w-3 text-slate-700" />
                      )}
                      {section.title === "Mock 服务" && (
                        <Zap className="h-3 w-3 text-slate-700" />
                      )}
                      {section.title === "系统管理" && (
                        <Shield className="h-3 w-3 text-slate-700" />
                      )}
                      {section.title === "支持" && (
                        <HelpCircle className="h-3 w-3 text-slate-700" />
                      )}
                      {section.title}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "group flex items-center justify-between rounded-xl px-3 py-3 text-sm transition-all duration-300 hover-glow",
                            isActive
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-soft"
                              : "text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "p-1.5 rounded-xl transition-all duration-300",
                                isActive
                                  ? "bg-slate-900 text-white shadow-soft"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-700",
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span
                              className={cn(
                                "font-medium transition-colors",
                                isActive
                                  ? "text-slate-900 dark:text-white"
                                  : "",
                              )}
                            >
                              {item.label}
                            </span>
                          </div>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs px-2 py-0.5 font-medium border",
                                item.badge === "Hot"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-green-100 text-green-700 border-green-200",
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                  {index < menuItems.length - 1 && (
                    <Separator className="my-4 mx-2" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* 底部信息卡片 */}
          <div className="border-t border-slate-200/60 dark:border-slate-700/60 p-4">
            <div className="rounded-xl glass-card p-4 border border-slate-200/60 dark:border-slate-700/60 shadow-soft hover-glow">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-6 w-6 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Mock Hub
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                版本 v0.1.0 - 企业级 Mock 服务平台
              </p>
              <div className="mt-2 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  服务运行中
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
