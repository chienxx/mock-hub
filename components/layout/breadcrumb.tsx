"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home, type LucideIcon } from "lucide-react";
import { useSession } from "next-auth/react";

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: LucideIcon;
}

export function Breadcrumb() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // 生成面包屑路径
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "仪表盘", href: "/dashboard", icon: Home },
    ];

    let currentPath = "";
    paths.forEach((path) => {
      currentPath += `/${path}`;

      // 跳过重复的dashboard路径
      if (currentPath === "/dashboard") {
        return;
      }

      // 格式化路径名称 - 改进中文显示
      let label = path;

      // 根据用户角色动态设置项目菜单名称
      const getProjectLabel = () => {
        const userRole = session?.user?.role;
        if (path === "projects") {
          switch (userRole) {
            case "ADMIN":
              return "所有项目";
            case "USER":
              return "我的项目";
            default:
              return "项目管理";
          }
        }
        return null;
      };

      const projectLabel = getProjectLabel();

      const pathMap: Record<string, string> = {
        projects: projectLabel || "项目管理",
        mocks: "API 接口",
        analytics: "数据分析",
        logs: "接口日志",
        users: "用户管理",
        notifications: "通知中心",
        docs: "开发文档",
        profile: "个人资料",
        dashboard: "仪表盘",
      };

      label =
        pathMap[path] ||
        path
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

      breadcrumbs.push({
        label,
        href: currentPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm mb-8">
      <div className="flex items-center space-x-1 p-3 rounded-xl glass-card border border-slate-200/60 dark:border-slate-700/60 shadow-soft">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const Icon = crumb.icon;

          return (
            <Fragment key={crumb.href}>
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 mx-1" />
              )}
              {isLast ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/15 to-primary/10 rounded-lg border border-primary/20">
                  {Icon && (
                    <div className="p-1 bg-primary/20 rounded-md">
                      <Icon className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <span className="font-semibold text-primary text-xs">
                    {crumb.label}
                  </span>
                </div>
              ) : (
                <Link
                  href={crumb.href}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white group"
                >
                  {Icon && (
                    <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-md group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                      <Icon className="h-3 w-3 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors" />
                    </div>
                  )}
                  <span className="font-medium text-xs">{crumb.label}</span>
                </Link>
              )}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}
