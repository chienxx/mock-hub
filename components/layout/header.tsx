"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/user/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full glass-card border-b border-border/40">
      <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
        {/* 移动端菜单按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden hover:bg-accent"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3 md:mr-8">
          <div className="bg-slate-900 rounded-xl p-2 shadow-sm">
            <svg
              className="h-5 w-5 text-white"
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
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-slate-900 dark:text-white">
                Mock Hub
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              企业级 API 服务平台
            </p>
          </div>
        </Link>

        {/* 搜索框 - 桌面端 */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="搜索项目、API、文档..."
              className="pl-10 bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 dark:hover:bg-slate-800/80"
            />
          </div>
        </div>

        {/* 导航菜单 - 桌面端 */}
        <nav className="hidden lg:flex items-center space-x-1 mr-6">
          <Button variant="ghost" className="text-sm font-medium" asChild>
            <Link href="/projects">项目管理</Link>
          </Button>
          <Button variant="ghost" className="text-sm font-medium" asChild>
            <Link href="/analytics">数据统计</Link>
          </Button>
          <Button variant="ghost" className="text-sm font-medium" asChild>
            <Link href="/help">帮助中心</Link>
          </Button>
        </nav>

        {/* 右侧区域 */}
        <div className="flex items-center space-x-3">
          {/* 搜索按钮 - 移动端 */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>

          {/* 通知按钮 */}
          {session?.user && <NotificationBell />}

          {/* 用户菜单 */}
          {session?.user && <UserMenu user={session.user} />}
        </div>
      </div>
    </header>
  );
}
