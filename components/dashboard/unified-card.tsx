"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface UnifiedCardProps {
  title?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "default" | "stat" | "list";
}

export function UnifiedCard({
  title,
  icon: Icon,
  action,
  children,
  className,
  variant = "default",
}: UnifiedCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
        "border border-slate-200/60 dark:border-slate-800/60",
        "rounded-xl shadow-sm",
        "hover:shadow-md hover:border-slate-300/60 dark:hover:border-slate-700/60",
        "transition-all duration-200",
        variant === "stat" && "hover:scale-[1.02]",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
            )}
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              {title}
            </h3>
          </div>
          {action && <div className="text-sm">{action}</div>}
        </div>
      )}
      <div className={cn(variant === "stat" ? "p-5" : title ? "p-5" : "p-5")}>
        {children}
      </div>
    </div>
  );
}

// 统计卡片专用组件
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: ReactNode;
  status?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  status,
  className,
}: StatCardProps) {
  return (
    <UnifiedCard variant="stat" className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            {label}
          </p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">
            {value}
          </p>
          {(trend || status) && (
            <div className="mt-2.5 flex items-center gap-2">
              {trend}
              {status && (
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {status}
                </span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 flex items-center justify-center">
            <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
        )}
      </div>
    </UnifiedCard>
  );
}

// 列表项组件
interface ListItemProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  className,
}: ListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 -mx-3",
        "rounded-lg transition-colors cursor-pointer",
        "hover:bg-slate-50 dark:hover:bg-slate-800/50",
        className,
      )}
      onClick={onClick}
    >
      {leading && <div className="flex-shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </div>
  );
}
