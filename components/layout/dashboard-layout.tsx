"use client";

import { useState, useEffect } from "react";
import { CollapsibleSidebar } from "./collapsible-sidebar";
import { DashboardHeader } from "./dashboard-header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
      {/* 简洁优雅的背景装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 微妙的渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-white to-slate-100/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/50"></div>

        {/* 柔和的光晕效果 */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

        {/* 噪点纹理覆盖 */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        ></div>
      </div>

      {/* Sidebar */}
      <CollapsibleSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      {/* Mobile overlay */}
      {isMobile && !sidebarCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Main content */}
      <div
        className={cn(
          "relative flex-1 flex flex-col overflow-hidden transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64",
          isMobile ? "ml-0" : "",
        )}
      >
        {/* Header */}
        <DashboardHeader onMenuClick={toggleSidebar} />

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
