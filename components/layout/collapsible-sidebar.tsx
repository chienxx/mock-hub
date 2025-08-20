"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Home,
  Folders,
  Network,
  TrendingUp,
  Users,
  FileText,
  Bell,
  ChevronLeft,
  ChevronRight,
  Shield,
  Server,
  BarChart3,
  Layers,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CollapsibleSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function CollapsibleSidebar({
  collapsed,
  onToggle,
}: CollapsibleSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // 根据用户角色动态生成菜单
  const getMenuItems = () => {
    const userRole = session?.user?.role;
    // 根据用户角色获取项目管理的显示名称
    const projectLabel =
      userRole === "ADMIN"
        ? "所有项目"
        : userRole === "USER"
          ? "我的项目"
          : "项目管理";

    const baseMenuItems = [
      {
        title: "工作台",
        icon: Home,
        items: [
          { label: "仪表盘", href: "/dashboard", icon: BarChart3, badge: null },
          {
            label: projectLabel,
            href: "/projects",
            icon: Folders,
            badge: null,
          },
        ],
      },
      {
        title: "Mock 服务",
        icon: Server,
        items: [
          { label: "API 接口", href: "/mocks", icon: Network, badge: "Hot" },
          { label: "接口日志", href: "/logs", icon: FileText, badge: null },
          {
            label: "数据分析",
            href: "/analytics",
            icon: TrendingUp,
            badge: null,
          },
        ],
      },
    ];

    // 管理员特有的系统管理菜单
    if (session?.user?.role === "ADMIN") {
      baseMenuItems.push({
        title: "系统管理",
        icon: Shield,
        items: [
          { label: "用户管理", href: "/users", icon: Users, badge: null },
          {
            label: "通知中心",
            href: "/notifications",
            icon: Bell,
            badge: null,
          },
          { label: "帮助中心", href: "/help", icon: HelpCircle, badge: "New" },
        ],
      });
    } else {
      // 普通用户看到的其他功能
      baseMenuItems.push({
        title: "其他",
        icon: Layers,
        items: [
          {
            label: "通知中心",
            href: "/notifications",
            icon: Bell,
            badge: null,
          },
          { label: "帮助中心", href: "/help", icon: HelpCircle, badge: "New" },
        ],
      });
    }

    return baseMenuItems;
  };

  const menuItems = getMenuItems();

  const renderMenuItem = (item: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | null;
  }) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;

    if (collapsed) {
      return (
        <TooltipProvider key={item.href}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link href={item.href}>
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-10 rounded-xl transition-all duration-200 relative mx-auto",
                    isActive
                      ? "bg-slate-900 text-white shadow-lg"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.badge && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                  )}
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2">
              {item.label}
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Link key={item.href} href={item.href}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
            isActive
              ? "bg-slate-900 text-white shadow-lg"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
          )}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{item.label}</span>
          {item.badge && (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs px-1.5 py-0.5 ml-auto",
                item.badge === "Hot"
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700",
              )}
            >
              {item.badge}
            </Badge>
          )}
        </div>
      </Link>
    );
  };

  const renderSection = (
    section: {
      title: string;
      icon: React.ComponentType<{ className?: string }>;
      items: {
        label: string;
        href: string;
        icon: React.ComponentType<{ className?: string }>;
        badge?: string | null;
      }[];
    },
    sectionIndex: number,
  ) => {
    const SectionIcon = section.icon;

    if (collapsed) {
      // 折叠状态：显示分组分隔符
      return (
        <div key={section.title} className="space-y-1">
          {sectionIndex > 0 && (
            <div className="flex justify-center py-2">
              <div className="w-8 h-px bg-slate-200 dark:bg-slate-700"></div>
            </div>
          )}
          {section.items.map(renderMenuItem)}
        </div>
      );
    }

    // 展开状态：显示完整分组
    return (
      <div key={section.title} className="space-y-1">
        <div className="px-2 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <SectionIcon className="w-3 h-3" />
            {section.title}
          </div>
        </div>
        <div className="space-y-1">{section.items.map(renderMenuItem)}</div>
        {sectionIndex < menuItems.length - 1 && (
          <div className="py-3">
            <div className="mx-2 border-t border-slate-200 dark:border-slate-700"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 z-40 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out flex flex-col",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
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
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Mock Hub
              </h2>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center mx-auto">
            <svg
              className="w-4 h-4 text-white"
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
        )}

        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="p-1.5 h-auto hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Toggle button for collapsed state */}
      {collapsed && (
        <div className="px-2 py-2 border-b border-slate-200 dark:border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="w-12 h-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 mx-auto flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div
          className={cn(
            collapsed ? "px-2 py-4 space-y-2" : "px-3 py-4 space-y-4",
          )}
        >
          {menuItems.map((section, index) => renderSection(section, index))}
        </div>
      </ScrollArea>
    </div>
  );
}
