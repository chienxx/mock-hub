"use client";

import { useState } from "react";
import {
  Plus,
  Network,
  FolderTree,
  Copy,
  CheckCircle,
  Globe,
  Code2,
  Layers,
  Terminal,
} from "lucide-react";
import { config } from "@/lib/config";
import { ProjectHeader } from "@/components/projects/project-header";
import { Button } from "@/components/ui/button";
import { CreateMockDialog } from "@/components/mocks/create-mock-dialog";
import { MockAPIList } from "@/components/mocks/mock-api-list";
import { CollectionTree } from "@/components/mocks/collection-tree";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Collection } from "@/types/mock";

interface MocksPageClientProps {
  projectId: string;
  projectName: string;
  projectShortId: string;
  mockAPIsCount: number;
  collectionsCount: number;
  collections: Collection[];
  canManage: boolean;
}

export function MocksPageClient({
  projectId,
  projectName,
  projectShortId,
  mockAPIsCount,
  collectionsCount,
  collections,
  canManage,
}: MocksPageClientProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [copied, setCopied] = useState(false);

  const mockUrl = `${config.getAppUrl()}/api/mock/${projectShortId}`;

  const handleCopyUrl = async () => {
    try {
      // 使用改进的复制逻辑，兼容 HTTP 环境
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(mockUrl);
      } else {
        // 降级方案：使用 execCommand
        const textArea = document.createElement("textarea");
        textArea.value = mockUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        textArea.setSelectionRange(0, 99999);

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!successful) {
          throw new Error("复制失败");
        }
      }

      setCopied(true);
      toast.success("Mock 服务地址已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败，请手动复制");
    }
  };

  return (
    <div className="space-y-6">
      {/* 项目头部导航 */}
      <ProjectHeader
        projectName={projectName}
        projectShortId={projectShortId}
        projectId={projectId}
        title="Mock API"
        subtitle={
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5" />
              {mockAPIsCount} 个接口
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {collectionsCount} 个分组
            </span>
          </div>
        }
        icon={<Network className="h-5 w-5 text-white" />}
        backToFunctionPage="/mocks"
      >
        {canManage && (
          <CreateMockDialog projectId={projectId}>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900">
              <Plus className="mr-2 h-4 w-4" />
              创建 Mock API
            </Button>
          </CreateMockDialog>
        )}
      </ProjectHeader>

      {/* Mock 服务地址卡片 */}
      <div
        className={cn(
          "relative overflow-hidden",
          "bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50",
          "border border-slate-200/60 dark:border-slate-800/60",
          "rounded-xl p-5",
        )}
      >
        {/* 装饰性背景 */}
        <div className="absolute inset-0 bg-grid-slate-100/[0.03] dark:bg-grid-slate-700/[0.05]" />
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-slate-900/5 dark:bg-white/5 rounded-full blur-3xl" />

        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Mock 服务地址
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex-1 flex items-center gap-2 px-4 py-2.5",
                  "bg-white dark:bg-slate-900",
                  "border border-slate-200 dark:border-slate-700",
                  "rounded-lg",
                  "font-mono text-sm",
                )}
              >
                <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <code className="text-slate-700 dark:text-slate-300 select-all">
                  {mockUrl}
                </code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className={cn(
                  "h-[42px] px-3",
                  "bg-white dark:bg-slate-900",
                  "border-slate-200 dark:border-slate-700",
                  "hover:bg-slate-50 dark:hover:bg-slate-800",
                  copied &&
                    "text-emerald-600 border-emerald-200 dark:border-emerald-800",
                )}
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                示例:
              </span>
              <code className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                GET {mockUrl}/users/list
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：分组树形导航 */}
        <div className="lg:col-span-1">
          <div
            className={cn(
              "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm",
              "border border-slate-200/60 dark:border-slate-800/60",
              "rounded-xl",
              "shadow-sm",
            )}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h3 className="font-medium text-sm text-slate-900 dark:text-white">
                  分组管理
                </h3>
              </div>
            </div>
            <div className="p-4">
              <CollectionTree
                collections={collections}
                projectId={projectId}
                canManage={canManage}
                selectedCollectionId={selectedCollectionId}
                onCollectionSelect={setSelectedCollectionId}
                totalMockAPIs={mockAPIsCount}
              />
            </div>
          </div>
        </div>

        {/* 右侧：Mock API 列表 */}
        <div className="lg:col-span-3">
          <MockAPIList
            projectId={projectId}
            projectShortId={projectShortId}
            canManage={canManage}
            selectedCollectionId={selectedCollectionId}
          />
        </div>
      </div>
    </div>
  );
}
