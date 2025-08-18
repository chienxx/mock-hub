"use client";

import { useSession } from "next-auth/react";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/user/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button - always visible on mobile */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden p-2"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Search bar */}
        <div className="hidden md:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索项目、API、文档..."
              className="pl-10 w-80 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Status indicator - 全局系统信息，优先显示 */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            系统正常
          </span>
        </div>

        {/* Mobile search */}
        <Button variant="ghost" size="sm" className="md:hidden p-2">
          <Search className="w-5 h-5" />
        </Button>

        {/* Notifications - 个人重要信息 */}
        {session?.user && <NotificationBell />}

        {/* User menu - 最个人化，放在最右侧 */}
        {session?.user && <UserMenu user={session.user} />}
      </div>
    </header>
  );
}
