"use client";

import { ChevronLeft, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ProjectHeaderProps {
  projectName: string;
  projectShortId?: string;
  title: string;
  subtitle?: string | React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  showBackToProject?: boolean;
  projectId?: string;
  // 新增：指定返回的功能页面
  backToFunctionPage?: string; // 如 '/mocks', '/logs', '/analytics'
}

export function ProjectHeader({
  projectName,
  projectShortId,
  title,
  subtitle,
  icon,
  children,
  showBackToProject = false,
  projectId,
  backToFunctionPage,
}: ProjectHeaderProps) {
  return (
    <div className="space-y-4">
      {/* 面包屑导航 */}
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        {backToFunctionPage ? (
          <>
            <Link
              href={backToFunctionPage}
              className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              {backToFunctionPage === "/mocks"
                ? "API 接口"
                : backToFunctionPage === "/logs"
                  ? "接口日志"
                  : backToFunctionPage === "/analytics"
                    ? "数据分析"
                    : "返回"}
            </Link>
            <ChevronLeft className="h-3 w-3 rotate-180" />
            <span className="text-slate-700 dark:text-slate-300">
              {projectName}
            </span>
            {projectShortId && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {projectShortId}
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <Link
              href="/projects"
              className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              项目管理
            </Link>
            <ChevronLeft className="h-3 w-3 rotate-180" />
            <Link
              href={projectId ? `/projects/${projectId}` : "/projects"}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {projectName}
            </Link>
            {projectShortId && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {projectShortId}
                </span>
              </>
            )}
          </>
        )}
      </div>

      {/* 页面标题 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="h-10 w-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {title}
            </h1>
            {subtitle &&
              (typeof subtitle === "string" ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {subtitle}
                </p>
              ) : (
                <div>{subtitle}</div>
              ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showBackToProject && projectId && (
            <Link href={`/projects/${projectId}`}>
              <Button
                variant="outline"
                className="border-slate-200 dark:border-slate-700"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                返回项目
              </Button>
            </Link>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
