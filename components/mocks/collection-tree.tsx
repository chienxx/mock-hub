"use client";

import { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { CreateCollectionDialog } from "@/components/mocks/create-collection-dialog";
import type { Collection } from "@/types/mock";

interface Props {
  collections: Collection[];
  projectId: string;
  canManage: boolean;
  selectedCollectionId?: string | null;
  onCollectionSelect?: (collectionId: string | null) => void;
  totalMockAPIs?: number;
}

interface TreeNodeProps {
  collection: Collection;
  level: number;
  canManage: boolean;
  onDelete: (collection: Collection) => void;
  onCollectionSelect?: (collectionId: string | null) => void;
  selectedCollectionId?: string | null;
}

function TreeNode({
  collection,
  level,
  canManage,
  onDelete,
  onCollectionSelect,
  selectedCollectionId,
}: TreeNodeProps) {
  // 初始状态：第一层默认展开，其他层默认折叠
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const isSelected = selectedCollectionId === collection.id;
  const storageKey = `collection-expanded-${collection.id}`;

  // 客户端hydration后，从localStorage读取状态
  useEffect(() => {
    setIsHydrated(true);
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      setIsExpanded(stored === "true");
    }
  }, [storageKey]);

  // 保存折叠状态到localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(storageKey, isExpanded.toString());
    }
  }, [isExpanded, storageKey, isHydrated]);

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer group ${
          isSelected ? "bg-accent" : ""
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onCollectionSelect?.(collection.id)}
      >
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {/* 展开/折叠按钮 - 只有有子分组时才显示 */}
          {collection.children && collection.children.length > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          ) : (
            <div className="w-4" /> // 占位，保持对齐
          )}

          {/* 文件夹图标 */}
          <div className="flex items-center gap-2">
            {isExpanded &&
            collection.children &&
            collection.children.length > 0 ? (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <span className="text-sm font-medium truncate">
            {collection.name}
          </span>

          {collection._count && (
            <Badge variant="secondary" className="text-xs ml-auto">
              {collection._count.mockAPIs}
            </Badge>
          )}
        </div>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                添加子分组
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                重命名
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(collection)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除分组
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 子分组 */}
      {isExpanded &&
        collection.children?.map((child) => (
          <TreeNode
            key={child.id}
            collection={child}
            level={level + 1}
            canManage={canManage}
            onDelete={onDelete}
            onCollectionSelect={onCollectionSelect}
            selectedCollectionId={selectedCollectionId}
          />
        ))}

      {showCreateDialog && (
        <CreateCollectionDialog
          projectId={collection.projectId}
          parentId={collection.id}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            setShowCreateDialog(false);
            // 刷新页面或更新状态
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

export function CollectionTree({
  collections,
  projectId,
  canManage,
  selectedCollectionId,
  onCollectionSelect,
  totalMockAPIs = 0,
}: Props) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // 构建树形结构
  const buildTree = (items: Collection[]): Collection[] => {
    const itemMap = new Map<string, Collection>();
    const result: Collection[] = [];

    // 先创建所有节点的映射
    items.forEach((item) => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // 然后构建父子关系
    items.forEach((item) => {
      const node = itemMap.get(item.id)!;
      if (item.parentId && itemMap.has(item.parentId)) {
        const parent = itemMap.get(item.parentId)!;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        result.push(node);
      }
    });

    return result;
  };

  const treeData = buildTree(collections);

  const handleDelete = async (collection: Collection) => {
    if (
      !confirm(
        `确定要删除分组 "${collection.name}" 吗？此操作将把该分组下的 Mock API 移动到未分组。`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/collections/${collection.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "删除分组失败");
      }

      toast.success("分组删除成功");
      // 刷新页面
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除分组失败");
    }
  };

  return (
    <div className="space-y-2">
      {/* 全部分组选项 */}
      <div
        className={`flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer ${
          !selectedCollectionId ? "bg-accent" : ""
        }`}
        onClick={() => onCollectionSelect?.(null)}
      >
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">全部接口</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {totalMockAPIs}
        </Badge>
      </div>

      {/* 未分组选项 */}
      <div
        className={`flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer ${
          selectedCollectionId === "uncategorized" ? "bg-accent" : ""
        }`}
        onClick={() => onCollectionSelect?.("uncategorized")}
      >
        <div className="flex items-center gap-2 pl-4">
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">未分组</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {totalMockAPIs -
            collections.reduce((sum, c) => sum + (c._count?.mockAPIs || 0), 0)}
        </Badge>
      </div>

      {/* 分组树 */}
      {treeData.map((collection) => (
        <TreeNode
          key={collection.id}
          collection={collection}
          level={0}
          canManage={canManage}
          onDelete={handleDelete}
          onCollectionSelect={onCollectionSelect}
          selectedCollectionId={selectedCollectionId}
        />
      ))}

      {/* 创建分组按钮 */}
      {canManage && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          创建分组
        </Button>
      )}

      {showCreateDialog && (
        <CreateCollectionDialog
          projectId={projectId}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            setShowCreateDialog(false);
            // 刷新页面或更新状态
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
