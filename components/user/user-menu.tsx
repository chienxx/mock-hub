"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, HelpCircle, Users, Bell, CircleUser } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || "User"}
            />
            <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 text-white text-xs font-medium">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg"
        align="end"
        forceMount
      >
        {/* 用户信息头部 */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {user.name || "用户"}
              </p>
              {user.role === "ADMIN" && (
                <Badge
                  variant="secondary"
                  className="text-xs h-4 px-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-0"
                >
                  管理员
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

        {/* 个人菜单组 */}
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.push("/profile")}
            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50"
          >
            <CircleUser className="mr-2 h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium">个人资料</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/notifications")}
            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50"
          >
            <Bell className="mr-2 h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium">通知中心</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {/* 管理员菜单 */}
        {user.role === "ADMIN" && (
          <>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => router.push("/users")}
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50"
              >
                <Users className="mr-2 h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium">用户管理</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}

        {/* 帮助和退出 */}
        {/* <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
        <DropdownMenuItem 
          onClick={() => router.push('/analytics')}
          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50"
        >
          <BarChart3 className="mr-2 h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-medium">数据分析</span>
        </DropdownMenuItem> */}

        <DropdownMenuItem
          onClick={() => router.push("/help")}
          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:bg-slate-50 dark:focus:bg-slate-800/50"
        >
          <HelpCircle className="mr-2 h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-medium">帮助中心</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 focus:bg-red-50 dark:focus:bg-red-900/20 text-red-600 dark:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span className="text-sm font-medium">退出登录</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
